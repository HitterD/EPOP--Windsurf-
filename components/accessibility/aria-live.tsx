/**
 * FE-a11y-3: ARIA live regions for status updates
 * WCAG 2.1 Status Messages (4.1.3) Level AA
 */

'use client'

import { useEffect, useRef } from 'react'

interface AriaLiveProps {
  /**
   * Message to announce
   */
  message: string
  /**
   * Politeness level
   * - 'polite': Wait for current announcement to finish
   * - 'assertive': Interrupt current announcement
   * - 'off': Don't announce
   */
  politeness?: 'polite' | 'assertive' | 'off'
  /**
   * Clear message after delay (ms)
   */
  clearAfter?: number
}

export function AriaLive({
  message,
  politeness = 'polite',
  clearAfter,
}: AriaLiveProps) {
  const messageRef = useRef<string>(message)

  useEffect(() => {
    messageRef.current = message

    if (clearAfter && message) {
      const timer = setTimeout(() => {
        messageRef.current = ''
      }, clearAfter)

      return () => clearTimeout(timer)
    }
  }, [message, clearAfter])

  if (!message || politeness === 'off') return null

  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

/**
 * Status announcer component for global status updates
 */
export function StatusAnnouncer() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Listen for global status events
    const handleStatusUpdate = (e: CustomEvent) => {
      if (ref.current) {
        const detail = (e as CustomEvent<{ message?: unknown }>).detail
        const msg = typeof detail?.message === 'string' ? detail.message : ''
        if (!msg) return
        ref.current.textContent = msg

        // Clear after 5 seconds
        setTimeout(() => {
          if (ref.current) {
            ref.current.textContent = ''
          }
        }, 5000)
      }
    }

    const listener = (e: Event) => handleStatusUpdate(e as CustomEvent)
    window.addEventListener('status-update', listener)
    return () => {
      window.removeEventListener('status-update', listener)
    }
  }, [])

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  )
}

/**
 * Utility to announce status updates
 */
export function announceStatus(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  const msg = typeof message === 'string' ? message : ''
  if (!msg) return
  const event = new CustomEvent('status-update', {
    detail: { message: msg, politeness },
  })
  window.dispatchEvent(event)
}

/**
 * Loading announcer for async operations
 */
export function LoadingAnnouncer({ loading, message }: { loading: boolean; message?: string }) {
  return (
    <AriaLive
      message={loading ? message || 'Loading...' : ''}
      politeness="polite"
    />
  )
}

/**
 * Error announcer for form errors
 */
export function ErrorAnnouncer({ error }: { error?: string | null }) {
  return (
    <AriaLive
      message={error || ''}
      politeness="assertive"
      clearAfter={5000}
    />
  )
}
