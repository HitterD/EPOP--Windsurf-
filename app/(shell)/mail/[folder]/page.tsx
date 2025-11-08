'use client'

import React from 'react'
import Link from 'next/link'
import { useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMail, useSetMailRead } from '@/lib/api/hooks/use-mail'
import { formatDate } from '@/lib/utils'
import VirtualList from '@/components/virtual/VirtualList'
import type { MailMessage, CursorPaginatedResponse } from '@/types'

export default function MailFolderPage({ params }: { params: { folder: string } }) {
  const pathname = usePathname()
  const folder = useMemo(() => {
    const f = params.folder?.toLowerCase()
    return (['received', 'sent', 'deleted'].includes(f) ? f : 'received') as 'received' | 'sent' | 'deleted'
  }, [params.folder])

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useMail(folder)
  const items = useMemo(() => {
    const pages = (data?.pages ?? []) as Array<CursorPaginatedResponse<MailMessage>>
    return pages.flatMap((p) => p.items ?? [])
  }, [data])
  const setMailRead = useSetMailRead(folder)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first && first.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-6">
        <h1 className="mb-4 text-3xl font-bold">Mail</h1>
        <Tabs value={folder} className="w-full">
          <TabsList>
            <TabsTrigger asChild value="received">
              <Link href="/mail/received">Received</Link>
            </TabsTrigger>
            <TabsTrigger asChild value="sent">
              <Link href="/mail/sent">Sent</Link>
            </TabsTrigger>
            <TabsTrigger asChild value="deleted">
              <Link href="/mail/deleted">Deleted</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value={folder} className="mt-6">
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-center text-muted-foreground">No messages in this folder</div>
              ) : (
                <VirtualList<MailMessage>
                  items={items}
                  estimateSize={88}
                  overscan={12}
                  className="h-[60vh]"
                  row={(m) => (
                    <Link key={m.id} href={`/mail/${folder}/${m.id}`}>
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="flex items-center justify-between gap-4 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="truncate font-medium" title={m.subject}>{m.subject}</span>
                              {!m.isRead && <Badge variant="destructive">Unread</Badge>}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              From: {m.from}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="whitespace-nowrap text-xs text-muted-foreground">
                              {formatDate(m.createdAt, 'relative')}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMailRead.mutate({ messageId: m.id, isRead: !m.isRead })
                              }}
                            >
                              {m.isRead ? 'Mark Unread' : 'Mark Read'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )}
                />
              )}
              <div ref={loadMoreRef} />
              {isFetchingNextPage && (
                <div className="text-center text-sm text-muted-foreground">Loading…</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
