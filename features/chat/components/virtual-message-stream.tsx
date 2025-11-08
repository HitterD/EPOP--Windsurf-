'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeList as List, ListChildComponentProps, ListOnItemsRenderedProps } from 'react-window'
import { Message } from '@/types'
import { MessageBubbleEnhanced } from './message-bubble-enhanced'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useMarkAsRead } from '@/lib/api/hooks/use-chats'

interface VirtualMessageStreamProps {
  messages: Message[]
  chatId: string
  onOpenThread?: (message: Message) => void
}

export function VirtualMessageStream({ messages, chatId, onOpenThread }: VirtualMessageStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(400)
  const [width, setWidth] = useState(600)
  const me = useAuthStore((s) => s.session?.user)
  const { mutate: markAsRead } = useMarkAsRead(chatId)
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setHeight(containerRef.current.clientHeight)
        setWidth(containerRef.current.clientWidth)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const Row = ({ index, style }: ListChildComponentProps) => {
    const m = messages[index]
    if (!m) return null
    const isOwn = m.senderId === me?.id
    return (
      <div style={style} data-testid="message-bubble">
        <MessageBubbleEnhanced
          message={m}
          isOwn={!!isOwn}
          showAvatar={true}
          onReply={() => onOpenThread?.(m)}
        />
      </div>
    )
  }

  const onItemsRendered = ({ visibleStartIndex, visibleStopIndex }: ListOnItemsRenderedProps) => {
    for (let i = visibleStartIndex; i <= visibleStopIndex; i++) {
      const m = messages[i]
      if (!m) continue
      const already = processedRef.current.has(m.id)
      const isOwn = m.senderId === me?.id
      if (!already && !isOwn) {
        processedRef.current.add(m.id)
        markAsRead(m.id)
      }
    }
  }

  return (
    <div ref={containerRef} className="h-full w-full" data-testid="message-list">
      <List
        height={height}
        width={width}
        itemCount={messages.length}
        itemSize={96}
        overscanCount={8}
        onItemsRendered={onItemsRendered}
      >
        {Row}
      </List>
    </div>
  )
}
