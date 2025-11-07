/**
 * Self-Hosted Error Tracking
 * Wave-3: FE-obs-errors
 * Captures and reports JavaScript errors without external SaaS dependencies
 */

'use client'

export interface ErrorReport {
  /** Error message */
  message: string
  /** Error stack trace */
  stack?: string
  /** Error type/name */
  name: string
  /** URL where error occurred */
  url: string
  /** User agent */
  userAgent: string
  /** Timestamp */
  timestamp: string
  /** Error level */
  level: 'error' | 'warning' | 'info'
  /** Additional context */
  context?: {
    userId?: string
    sessionId?: string
    component?: string
    action?: string
    [key: string]: any
  }
  /** Browser info */
  browser?: {
    name: string
    version: string
    os: string
  }
  /** Breadcrumbs (user actions leading to error) */
  breadcrumbs?: Breadcrumb[]
}

export interface Breadcrumb {
  timestamp: string
  category: 'navigation' | 'user' | 'console' | 'network' | 'lifecycle'
  message: string
  data?: Record<string, any>
  level?: 'info' | 'warning' | 'error'
}

class ErrorTracker {
  private endpoint: string = '/api/v1/errors'
  private breadcrumbs: Breadcrumb[] = []
  private maxBreadcrumbs: number = 50
  private sessionId: string
  private userId: string | undefined
  private enabled: boolean = true
  private beforeSend?: (report: ErrorReport) => ErrorReport | null

  constructor() {
    this.sessionId = this.generateSessionId()
    
    if (typeof window !== 'undefined') {
      this.initializeHandlers()
    }
  }

  /**
   * Initialize global error handlers
   */
  private initializeHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        level: 'error',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason)),
        {
          level: 'error',
          context: {
            type: 'unhandledrejection',
          },
        }
      )
    })

    // Console error capture (for debugging)
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error
      console.error = (...args) => {
        this.addBreadcrumb({
          category: 'console',
          message: args.join(' '),
          level: 'error',
        })
        originalError.apply(console, args)
      }
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  /**
   * Parse user agent to extract browser info
   */
  private parseBrowserInfo(): ErrorReport['browser'] {
    const ua = navigator.userAgent
    
    // Simple browser detection (can be enhanced with ua-parser-js if needed)
    let browserName = 'Unknown'
    let browserVersion = 'Unknown'
    let os = 'Unknown'

    if (ua.includes('Chrome')) {
      browserName = 'Chrome'
      const match = ua.match(/Chrome\/([\d.]+)/)
      if (match && match[1]) browserVersion = match[1]
    } else if (ua.includes('Firefox')) {
      browserName = 'Firefox'
      const match = ua.match(/Firefox\/([\d.]+)/)
      if (match && match[1]) browserVersion = match[1]
    } else if (ua.includes('Safari')) {
      browserName = 'Safari'
      const match = ua.match(/Version\/([\d.]+)/)
      if (match && match[1]) browserVersion = match[1]
    }

    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS')) os = 'iOS'

    return { name: browserName, version: browserVersion, os }
  }

  /**
   * Add breadcrumb (user action trail)
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: new Date().toISOString(),
    })

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs)
    }
  }

  /**
   * Capture an error
   */
  captureError(
    error: Error,
    options?: {
      level?: ErrorReport['level']
      context?: ErrorReport['context']
    }
  ) {
    if (!this.enabled) return

    const browserInfo = this.parseBrowserInfo()
    const report: ErrorReport = {
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
      name: error.name,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      level: options?.level || 'error',
      context: {
        sessionId: this.sessionId,
        ...(this.userId ? { userId: this.userId } : {}),
        ...options?.context,
      },
      ...(browserInfo ? { browser: browserInfo } : {}),
      breadcrumbs: [...this.breadcrumbs],
    }

    // Call beforeSend hook if provided
    const finalReport = this.beforeSend ? this.beforeSend(report) : report
    if (!finalReport) return // Hook can filter out errors

    this.sendReport(finalReport)
  }

  /**
   * Capture a message (not an error)
   */
  captureMessage(
    message: string,
    level: ErrorReport['level'] = 'info',
    context?: ErrorReport['context']
  ) {
    this.captureError(new Error(message), { level, context })
  }

  /**
   * Send error report to backend
   */
  private async sendReport(report: ErrorReport) {
    try {
      // Use sendBeacon for reliability (works even when page is closing)
      const blob = new Blob([JSON.stringify(report)], {
        type: 'application/json',
      })
      const sent = navigator.sendBeacon(this.endpoint, blob)

      if (!sent) {
        // Fallback to fetch
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
          keepalive: true,
        })
      }

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🐛 Error Tracked')
        console.error('Error:', report.message)
        console.log('Report:', report)
        console.groupEnd()
      }
    } catch (error) {
      // Silently fail - don't create infinite error loop
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send error report:', error)
      }
    }
  }

  /**
   * Configure error tracker
   */
  configure(options: {
    endpoint?: string
    userId?: string
    enabled?: boolean
    beforeSend?: (report: ErrorReport) => ErrorReport | null
  }) {
    if (options.endpoint) this.endpoint = options.endpoint
    if (options.userId !== undefined) this.userId = options.userId
    if (options.enabled !== undefined) this.enabled = options.enabled
    if (options.beforeSend) this.beforeSend = options.beforeSend
  }

  /**
   * Set user context
   */
  setUser(userId: string, userData?: Record<string, any>) {
    this.userId = userId
    this.addBreadcrumb({
      category: 'lifecycle',
      message: 'User identified',
      data: { userId, ...userData },
    })
  }

  /**
   * Clear user context
   */
  clearUser() {
    this.userId = undefined
    this.addBreadcrumb({
      category: 'lifecycle',
      message: 'User cleared',
    })
  }

  /**
   * Add navigation breadcrumb
   */
  captureNavigation(to: string, from?: string) {
    this.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${to}`,
      data: { to, from },
    })
  }

  /**
   * Add network breadcrumb
   */
  captureNetworkRequest(
    url: string,
    method: string,
    statusCode?: number,
    duration?: number
  ) {
    this.addBreadcrumb({
      category: 'network',
      message: `${method} ${url}`,
      data: { url, method, statusCode, duration },
      level: statusCode && statusCode >= 400 ? 'error' : 'info',
    })
  }

  /**
   * Get current breadcrumbs
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs]
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs() {
    this.breadcrumbs = []
  }
}

// Global singleton instance
let errorTrackerInstance: ErrorTracker | null = null

/**
 * Get or create error tracker instance
 */
export function getErrorTracker(): ErrorTracker {
  if (!errorTrackerInstance) {
    errorTrackerInstance = new ErrorTracker()
  }
  return errorTrackerInstance
}

/**
 * Initialize error tracking with configuration
 */
export function initErrorTracking(options?: Parameters<ErrorTracker['configure']>[0]) {
  const tracker = getErrorTracker()
  if (options) {
    tracker.configure(options)
  }
  return tracker
}

/**
 * Capture an error
 */
export function captureError(
  error: Error,
  options?: Parameters<ErrorTracker['captureError']>[1]
) {
  getErrorTracker().captureError(error, options)
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level?: ErrorReport['level'],
  context?: ErrorReport['context']
) {
  getErrorTracker().captureMessage(message, level, context)
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>) {
  getErrorTracker().addBreadcrumb(breadcrumb)
}

/**
 * Set user context
 */
export function setUser(userId: string, userData?: Record<string, any>) {
  getErrorTracker().setUser(userId, userData)
}

/**
 * Clear user context
 */
export function clearUser() {
  getErrorTracker().clearUser()
}

/**
 * Capture navigation
 */
export function captureNavigation(to: string, from?: string) {
  getErrorTracker().captureNavigation(to, from)
}

/**
 * Capture network request
 */
export function captureNetworkRequest(
  url: string,
  method: string,
  statusCode?: number,
  duration?: number
) {
  getErrorTracker().captureNetworkRequest(url, method, statusCode, duration)
}

/**
 * Performance monitoring wrapper
 */
export function withErrorTracking<T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args)
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureError(error, {
            context: { function: fn.name, customContext: context },
          })
          throw error
        })
      }
      
      return result
    } catch (error) {
      captureError(error as Error, {
        context: { function: fn.name, customContext: context },
      })
      throw error
    }
  }) as T
}
