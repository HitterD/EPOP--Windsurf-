/**
 * Performance monitoring utilities
 */

/**
 * Measure performance of async operations
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`)
  }

  return { result, duration }
}

/**
 * Measure performance of sync operations
 */
export function measureSync<T>(
  label: string,
  fn: () => T
): { result: T; duration: number } {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`)
  }

  return { result, duration }
}

/**
 * Create a performance mark
 */
export function mark(name: string) {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name)
  }
}

/**
 * Measure time between two marks
 */
export function measure(name: string, startMark: string, endMark: string): number | null {
  if ('performance' in window && 'measure' in performance) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name, 'measure')[0]
      return measure ? measure.duration : null
    } catch (e) {
      console.error('Performance measurement failed:', e)
      return null
    }
  }
  return null
}

/**
 * Clear performance marks and measures
 */
export function clearPerformance() {
  if ('performance' in window) {
    if ('clearMarks' in performance) performance.clearMarks()
    if ('clearMeasures' in performance) performance.clearMeasures()
  }
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let inThrottle = false
  let lastResult: ReturnType<T> | undefined

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args) as ReturnType<T>
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
    return lastResult
  }
}

/**
 * Lazy load components
 */
export function lazyWithPreload<T extends React.ComponentType>(
  factory: () => Promise<{ default: T }>
) {
  const LazyComponent = React.lazy(factory)
  let factoryPromise: Promise<{ default: T }> | undefined

  return Object.assign(LazyComponent, {
    preload: () => {
      if (!factoryPromise) {
        factoryPromise = factory()
      }
      return factoryPromise
    },
  })
}

import React from 'react'

/**
 * Monitor component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = React.useRef(0)
  const startTime = React.useRef(performance.now())

  React.useEffect(() => {
    renderCount.current += 1
    const duration = performance.now() - startTime.current

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Render] ${componentName} - Render #${renderCount.current} (${duration.toFixed(2)}ms)`
      )
    }

    startTime.current = performance.now()
  })
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args) as ReturnType<T>
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Report Web Vitals
 */
import type { Metric } from 'web-vitals'
export function reportWebVitals(metric: Metric) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}:`, metric.value)
  }

  // Send to analytics endpoint
  if (typeof window !== 'undefined' && 'sendBeacon' in navigator) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
    })
    navigator.sendBeacon('/api/analytics/vitals', body)
  }
}
