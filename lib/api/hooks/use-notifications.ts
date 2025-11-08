import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { apiClient } from '../client'
import { Notification, NotificationPreferences, CursorPaginatedResponse } from '@/types'
import { buildCursorQuery, withIdempotencyKey } from '../utils'

export function useNotifications(limit = 50) {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam }) => {
      const query = buildCursorQuery({
        ...(pageParam ? { cursor: pageParam } : {}),
        ...(limit ? { limit } : {}),
      })
      const res = await apiClient.get<CursorPaginatedResponse<Notification>>(
        `/notifications${query}`
      )
      if (!res.success || !res.data) throw new Error('Failed to fetch notifications')
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 30_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiClient.post(`/notifications/${notificationId}/read`, {}, withIdempotencyKey())
      if (!res.success) throw new Error('Failed to mark as read')
      return true
    },
    onSuccess: (_data, notificationId) => {
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Notification>> | undefined>(
        ['notifications'],
        (old) => {
          if (!old) return old
          const pages = old.pages.map((p): CursorPaginatedResponse<Notification> => ({
            ...p,
            items: (p.items || []).map((n: Notification) => (n.id === notificationId ? { ...n, isRead: true } : n)),
          }))
          return { ...old, pages }
        },
      )
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/notifications/mark-all-read', {}, withIdempotencyKey())
      if (!res.success) throw new Error('Failed to mark notifications as read')
    },
    onSuccess: () => {
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Notification>> | undefined>(
        ['notifications'],
        (old) => {
          if (!old) return old
          const pages = old.pages.map((p): CursorPaginatedResponse<Notification> => ({
            ...p,
            items: (p.items || []).map((n: Notification) => ({ ...n, isRead: true })),
          }))
          return { ...old, pages }
        },
      )
      qc.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })
}

export function useCreateNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Pick<Notification, 'title' | 'message' | 'type' | 'actionUrl'>) => {
      const res = await apiClient.post<Notification>('/notifications', payload, withIdempotencyKey())
      if (!res.success || !res.data) throw new Error('Failed to create notification')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useSubscribeNotifications() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/notifications/subscribe', {}, withIdempotencyKey())
      if (!res.success) throw new Error('Subscription failed')
      return true
    },
  })
}

/**
 * Get notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await apiClient.get<NotificationPreferences>('/notifications/preferences')
      if (!res.success || !res.data) throw new Error('Failed to fetch preferences')
      return res.data
    },
    staleTime: 60_000,
  })
}

/**
 * Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const res = await apiClient.patch('/notifications/preferences', preferences, withIdempotencyKey())
      if (!res.success) throw new Error('Failed to update preferences')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}

/**
 * Subscribe to Web Push notifications
 */
export function useSubscribeWebPush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (subscription: PushSubscription) => {
      const res = await apiClient.post('/notifications/web-push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
      }, withIdempotencyKey())
      if (!res.success) throw new Error('Failed to subscribe to push notifications')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}

/**
 * Unsubscribe from Web Push notifications
 */
export function useUnsubscribeWebPush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/notifications/web-push/unsubscribe', {}, withIdempotencyKey())
      if (!res.success) throw new Error('Failed to unsubscribe from push notifications')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
  })
}

/**
 * Helper to convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    const val = bytes[i] ?? 0
    binary += String.fromCharCode(val)
  }
  return btoa(binary)
}
