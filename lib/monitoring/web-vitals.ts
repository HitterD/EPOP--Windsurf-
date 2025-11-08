/**
 * FE-Obs-1: Web Vitals Reporting
 * Collects and reports Core Web Vitals to backend
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals'

interface VitalsPayload {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
  url: string
  timestamp: string
  userAgent: string
}

/**
 * Report Web Vitals to backend endpoint
 * Note: Backend endpoint /api/v1/vitals needs to be implemented
 */
async function sendToAnalytics(metric: Metric) {
  // Get rating based on thresholds
  const rating = getRating(metric.name, metric.value)

  const payload: VitalsPayload = {
    name: metric.name,
    value: metric.value,
    rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  }

  // Send to backend (fire and forget)
  try {
    // Use sendBeacon for reliability (works even when page is closing)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    const sent = navigator.sendBeacon('/api/v1/vitals', blob)
    
    if (!sent) {
      // Fallback to fetch if sendBeacon fails
      fetch('/api/v1/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true, // Keep request alive even if page closes
      }).catch(() => {
        // Silently fail - don't impact user experience
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to send Web Vitals:', metric.name)
        }
      })
    }
  } catch (error) {
    // Silently fail
    if (process.env.NODE_ENV === 'development') {
      console.error('Error sending Web Vitals:', error)
    }
  }

  // Also send to custom error tracking (if configured)
  if (typeof window !== 'undefined') {
    const reporter = (window as unknown as { __reportMetric?: (p: VitalsPayload) => void }).__reportMetric
    if (typeof reporter === 'function') {
      reporter(payload)
    }
  }
}

/**
 * Get rating based on Web Vitals thresholds
 * Based on https://web.dev/vitals/
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    // [good, needs-improvement] thresholds
    CLS: [0.1, 0.25],      // Cumulative Layout Shift
    INP: [200, 500],       // Interaction to Next Paint (replaces FID)
    LCP: [2500, 4000],     // Largest Contentful Paint
    FCP: [1800, 3000],     // First Contentful Paint
    TTFB: [800, 1800],     // Time to First Byte
  }

  const [goodThreshold, poorThreshold] = thresholds[name] || [0, Infinity]

  if (value <= goodThreshold) return 'good'
  if (value <= poorThreshold) return 'needs-improvement'
  return 'poor'
}

/**
 * Initialize Web Vitals reporting
 * Call this once in app initialization
 */
export function reportWebVitals() {
  // Only run in browser
  if (typeof window === 'undefined') return

  // Core Web Vitals
  onCLS(sendToAnalytics)  // Cumulative Layout Shift
  onINP(sendToAnalytics)  // Interaction to Next Paint (new)
  onLCP(sendToAnalytics)  // Largest Contentful Paint

  // Additional metrics
  onFCP(sendToAnalytics)  // First Contentful Paint
  onTTFB(sendToAnalytics) // Time to First Byte
}

/**
 * Custom performance mark
 */
export function markPerformance(name: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(name)
  }
}

/**
 * Measure time between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof window !== 'undefined' && window.performance) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure | undefined
      if (!measure) return
      
      // Report custom metric
      const metric: Partial<Metric> = {
        name: name as 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB', // Cast to the expected type
        value: measure.duration,
        delta: measure.duration,
        id: `${name}-${Date.now()}`,
        navigationType: 'navigate',
      }
      
      sendToAnalytics(metric as Metric)
    } catch (error) {
      // Silently fail
    }
  }
}

/**
 * Report custom metric
 */
export function reportCustomMetric(name: string, value: number, metadata?: Record<string, unknown>) {
  const payload = {
    name: `custom.${name}`,
    value,
    rating: 'good' as const,
    delta: value,
    id: `${name}-${Date.now()}`,
    navigationType: 'navigate',
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    metadata,
  }

  try {
    fetch('/api/v1/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silently fail
    })
  } catch (error) {
    // Silently fail
  }
}
