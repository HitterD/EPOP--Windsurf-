'use client'

import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Message } from '@/types'
import { MessageBubbleEnhanced } from './message-bubble-enhanced'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useMarkAsRead } from '@/lib/api/hooks/use-chats'

interface VirtualizedMessageListProps {
  messages: Message[]
  chatId: string
  onOpenThread?: (message: Message) => void
}

/**
 * High-performance virtualized message list using @tanstack/react-virtual
 * Optimized for 60fps with 10k+ messages
 * FE-Perf-2: TanStack Virtual implementation
 */
export function VirtualizedMessageList({
  messages,
  chatId,
  onOpenThread,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const me = useAuthStore((s) => s.session?.user)
  const { mutate: markAsRead } = useMarkAsRead(chatId)
  const processedRef = useRef<Set<string>>(new Set())

  // Configure virtualizer with optimized settings
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96, // Average message height
    overscan: 8, // Render 8 items above/below viewport for smooth scrolling
    ...(typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
      ? {
          measureElement: (
            element: Element,
            _entry?: ResizeObserverEntry,
            _instance?: import('@tanstack/react-virtual').Virtualizer<HTMLDivElement, Element>,
          ) => (element as HTMLElement).getBoundingClientRect().height,
        }
      : {}),
  })

  const items = virtualizer.getVirtualItems()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && parentRef.current) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      })
    }
  }, [messages.length, virtualizer])

  // Mark visible messages as read
  useEffect(() => {
    items.forEach((virtualRow) => {
      const message = messages[virtualRow.index]
      if (!message) return

      const already = processedRef.current.has(message.id)
      const isOwn = message.senderId === me?.id

      if (!already && !isOwn) {
        processedRef.current.add(message.id)
        markAsRead(message.id)
      }
    })
  }, [items, messages, me?.id, markAsRead])

  return (
    <div
      ref={parentRef}
      className="h-full w-full overflow-y-auto"
      data-testid="virtualized-message-list"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const message = messages[virtualRow.index]
          if (!message) return null

          const isOwn = message.senderId === me?.id

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              data-testid="message-bubble"
            >
              <MessageBubbleEnhanced
                message={message}
                isOwn={!!isOwn}
                showAvatar={true}
                onReply={() => onOpenThread?.(message)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
