'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNotifications, useMarkNotificationRead, useSubscribeNotifications, useMarkAllNotificationsAsRead } from '@/lib/api/hooks/use-notifications'
import type { Notification, CursorPaginatedResponse } from '@/types'
import { formatDate } from '@/lib/utils'

export default function NotificationsPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications()
  const items = ((data?.pages || []) as Array<CursorPaginatedResponse<Notification>>).flatMap((p) => p.items || [])
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsAsRead()
  const subscribe = useSubscribeNotifications()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Latest updates and alerts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            {markAll.isPending ? 'Marking…' : 'Mark all as read'}
          </Button>
          <Button onClick={() => subscribe.mutate()} disabled={subscribe.isPending}>
            {subscribe.isPending ? 'Subscribing...' : 'Subscribe to push'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((n: Notification) => (
          <Card key={n.id} className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="truncate font-medium" title={n.title}>{n.title}</span>
                  {!n.isRead && <Badge variant="destructive">New</Badge>}
                  <Badge variant="outline">{n.type}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.createdAt, 'relative')}</p>
              </div>
              {!n.isRead && (
                <Button size="sm" variant="outline" onClick={() => markRead.mutate(n.id)}>
                  Mark as read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-center text-muted-foreground">You're all caught up</div>
        )}
        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
