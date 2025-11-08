/**
 * Performance Monitoring Utilities
 * Track and report performance metrics
 */

export interface PerformanceMetrics {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map()

  /**
   * Start tracking a metric
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    const base: PerformanceMetrics = {
      name,
      startTime: performance.now(),
    }
    this.metrics.set(name, metadata ? { ...base, metadata } : base)
  }

  /**
   * End tracking and calculate duration
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`)
      return null
    }

    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ ${name}: ${metric.duration.toFixed(2)}ms`, metric.metadata)
    }

    // Send to analytics in production (implement later)
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric)
    }

    this.metrics.delete(name)
    return metric.duration
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(name: string, fn: () => T | Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.start(name, metadata)
    try {
      const result = await fn()
      this.end(name)
      return result
    } catch (error) {
      this.end(name)
      throw error
    }
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetrics): void {
    // Implement: Send to your analytics service
    // Example: Google Analytics, Sentry, custom API
    if (metric.duration && metric.duration > 3000) {
      console.warn(`⚠️ Slow operation detected: ${metric.name} took ${metric.duration}ms`)
    }
  }

  /**
   * Get Web Vitals
   */
  getWebVitals(): void {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      const lcp = lastEntry as unknown as { renderTime?: number; loadTime?: number }
      console.log('LCP:', lcp.renderTime ?? lcp.loadTime)
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        const e = entry as unknown as { processingStart?: number; startTime?: number }
        if (typeof e.processingStart === 'number' && typeof e.startTime === 'number') {
          console.log('FID:', e.processingStart - e.startTime)
        }
      })
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const e = entry as unknown as { hadRecentInput?: boolean; value?: number }
        if (!e.hadRecentInput && typeof e.value === 'number') {
          clsValue += e.value
          console.log('CLS:', clsValue)
        }
      })
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })
  }
}

export const performanceMonitor = new PerformanceMonitor()

/**
 * React Hook for measuring component render time
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now()

  return () => {
    const duration = performance.now() - startTime
    if (duration > 100 && process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Slow render: ${componentName} took ${duration.toFixed(2)}ms`)
    }
  }
}

/**
 * Report long tasks (blocking the main thread)
 */
export function monitorLongTasks(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) {
          console.warn(`⚠️ Long task detected: ${entry.duration.toFixed(2)}ms`)
        }
      })
    })
    observer.observe({ entryTypes: ['longtask'] })
  } catch (error) {
    // Long task API not supported
  }
}
