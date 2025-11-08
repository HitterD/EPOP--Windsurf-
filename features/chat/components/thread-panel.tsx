'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Message, type CursorPaginatedResponse } from '@/types'
import type { InfiniteData } from '@tanstack/react-query'
import { useThreadMessages } from '@/lib/api/hooks/use-chats'
import { MessageBubbleEnhanced } from './message-bubble-enhanced'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ThreadCompose } from './thread-compose'

interface ThreadPanelProps {
  chatId: string
  parent: Message
  onClose: () => void
}

export function ThreadPanel({ chatId, parent, onClose }: ThreadPanelProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useThreadMessages(chatId, parent.id)
  const replies = useMemo(() => {
    const pages = (data?.pages || []) as Array<CursorPaginatedResponse<Message>>
    return pages.flatMap((p) => p.items || [])
  }, [data])
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>(400)
  const me = useAuthStore((s) => s.session?.user)

  useEffect(() => {
    const update = () => {
      if (listContainerRef.current) {
        setHeight(listContainerRef.current.clientHeight)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const Row = ({ index, style }: ListChildComponentProps) => {
    const m = replies[index]!
    return (
      <div style={style}>
        <MessageBubbleEnhanced message={m} isOwn={m?.senderId === me?.id} showAvatar={true} />
      </div>
    )
  }

  return (
    <div className="flex h-full w-[360px] flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b p-3">
        <div className="font-semibold">Thread</div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="border-b p-3">
        <Card>
          <CardContent className="p-3">
            <MessageBubbleEnhanced message={parent} isOwn={parent?.senderId === me?.id} showAvatar={true} />
          </CardContent>
        </Card>
      </div>

      <div ref={listContainerRef} className="flex-1">
        <List height={height} width={360} itemCount={replies.length} itemSize={96} overscanCount={6}>
          {Row}
        </List>
      </div>

      <ThreadCompose chatId={chatId} threadId={parent.id} />

      {hasNextPage && (
        <div className="flex items-center justify-center border-t p-2">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
