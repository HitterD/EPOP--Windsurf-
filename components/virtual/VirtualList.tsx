'use client'

/**
 * VirtualList with Accessibility Support
 * Wave-1: FE-a11y-virtual
 * Implements WCAG 2.1 guidelines for virtualized content
 */

import React from 'react'
import { useRef, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

type Props<T> = {
  items: T[]
  estimateSize?: number
  row: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  /** Accessible label for the list */
  ariaLabel?: string
  /** ID for aria-labelledby */
  ariaLabelledBy?: string
  /** Role override (default: 'list') */
  role?: string
  /** Announce loading state */
  isLoading?: boolean
  /** Announce range to screen readers */
  announceRange?: boolean
}

export default function VirtualList<T>({ 
  items, 
  estimateSize = 56, 
  row, 
  overscan = 8, 
  className,
  ariaLabel,
  ariaLabelledBy,
  role = 'list',
  isLoading = false,
  announceRange = true,
}: Props<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [liveText, setLiveText] = useState('')
  
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  const virtualItems = v.getVirtualItems()
  const firstIndex = virtualItems[0]?.index ?? 0
  const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? 0

  // Announce visible range changes to screen readers
  useEffect(() => {
    if (!announceRange || items.length === 0) return
    
    const timeout = setTimeout(() => {
      const visibleCount = virtualItems.length
      if (visibleCount > 0) {
        setLiveText(
          `Showing items ${firstIndex + 1} to ${lastIndex + 1} of ${items.length}`
        )
      }
    }, 500) // Debounce announcements

    return () => clearTimeout(timeout)
  }, [firstIndex, lastIndex, items.length, virtualItems.length, announceRange])

  return (
    <>
      {/* Screen reader live region for dynamic updates */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {liveText}
      </div>

      <div 
        ref={parentRef} 
        className={`h-full overflow-auto ${className ?? ''}`}
        role={role}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-busy={isLoading}
        aria-setsize={items.length}
        // Help screen readers understand this is scrollable
        tabIndex={0}
        // Keyboard navigation hint
        aria-describedby="virtuallist-hint"
      >
        <div 
          role="presentation"
          style={{ 
            height: v.getTotalSize(), 
            position: 'relative',
          }}
        >
          {virtualItems.map((vi) => {
            const item = items[vi.index]
            if (item === undefined) return null
            return (
              <div
                key={vi.key}
                ref={v.measureElement}
                role={role === 'list' ? 'listitem' : undefined}
                aria-setsize={items.length}
                aria-posinset={vi.index + 1}
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  transform: `translateY(${vi.start}px)`, 
                  height: vi.size 
                }}
              >
                {row(item as T, vi.index)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Hidden hint for keyboard users */}
      <div id="virtuallist-hint" className="sr-only">
        Use arrow keys to scroll through the list
      </div>
    </>
  )
}
