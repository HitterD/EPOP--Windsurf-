import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { apiClient } from '../client'
import { MailMessage, CursorPaginatedResponse } from '@/types'
import { buildCursorQuery, withIdempotencyKey } from '../utils'

export function useMail(folder: 'received' | 'sent' | 'deleted', limit = 50) {
  return useInfiniteQuery({
    queryKey: ['mail', folder],
    queryFn: async ({ pageParam }) => {
      const query = buildCursorQuery({
        ...(pageParam ? { cursor: pageParam } : {}),
        ...(limit ? { limit } : {}),
      })
      const res = await apiClient.get<CursorPaginatedResponse<MailMessage>>(
        `/mail?folder=${folder}${query ? '&' + query.substring(1) : ''}`
      )
      if (!res.success || !res.data) throw new Error('Failed to fetch mail')
      return res.data
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  })
}

export function useSetMailRead(folder?: 'received' | 'sent' | 'deleted') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ messageId, isRead }: { messageId: string; isRead: boolean }) => {
      const res = await apiClient.patch<MailMessage>(`/mail/${messageId}`, { isRead }, withIdempotencyKey())
      if (!res.success || !res.data) throw new Error('Failed to update read state')
      return res.data
    },
    onMutate: async ({ messageId, isRead }) => {
      const listKey = folder ? ['mail', folder] : undefined
      const prevList = listKey ? qc.getQueryData<InfiniteData<CursorPaginatedResponse<MailMessage>> | undefined>(listKey) : undefined
      const prevDetail = qc.getQueryData<MailMessage>(['mail-message', messageId])

      if (listKey) {
        qc.setQueryData<InfiniteData<CursorPaginatedResponse<MailMessage>> | undefined>(
          listKey,
          (old) => {
            if (!old) return old
            const pages = old.pages.map((p): CursorPaginatedResponse<MailMessage> => ({
              ...p,
              items: (p.items || []).map((m: MailMessage) => (m.id === messageId ? { ...m, isRead } : m)),
            }))
            return { ...old, pages }
          },
        )
      }
      if (prevDetail) {
        qc.setQueryData<MailMessage>(['mail-message', messageId], { ...prevDetail, isRead })
      }

      return { prevList, prevDetail, listKey }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      if (ctx.listKey && ctx.prevList) {
        qc.setQueryData(ctx.listKey, ctx.prevList)
      }
      if (ctx.prevDetail) {
        const id = ctx.prevDetail.id
        qc.setQueryData(['mail-message', id], ctx.prevDetail)
      }
    },
    onSuccess: (_data, vars) => {
      // Ensure detail reflects server
      qc.invalidateQueries({ queryKey: ['mail-message', vars.messageId] })
    },
  })
}

type SendMailPayload = {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  attachments?: string[]
}

export function useSendMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: SendMailPayload) => {
      const res = await apiClient.post<MailMessage>('/mail', data, withIdempotencyKey())
      if (!res.success || !res.data) throw new Error('Failed to send mail')
      return res.data
    },
    onSuccess: (msg) => {
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<MailMessage>> | undefined>(
        ['mail', 'sent'],
        (old) => {
          if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old
          const first = old.pages[0]!
          return {
            ...old,
            pages: [
              { ...first, items: [msg, ...(first.items || [])] },
              ...old.pages.slice(1),
            ],
          }
        },
      )
    },
  })
}

export function useMailMessage(messageId: string | undefined) {
  return useQuery({
    queryKey: ['mail-message', messageId],
    queryFn: async () => {
      const res = await apiClient.get<MailMessage>(`/mail/${messageId}`)
      if (!res.success || !res.data) throw new Error('Failed to fetch message')
      return res.data
    },
    enabled: !!messageId,
  })
}

export function useMoveMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ messageId, folder }: { messageId: string; folder: 'received' | 'sent' | 'deleted' }) => {
      const res = await apiClient.patch<MailMessage>(
        `/mail/${messageId}/move`,
        { folder },
        withIdempotencyKey()
      )
      if (!res.success || !res.data) throw new Error('Failed to move message')
      return res.data
    },
    onSuccess: (msg, variables) => {
      // Add to destination folder first page
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<MailMessage>> | undefined>(
        ['mail', variables.folder],
        (old) => {
          if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old
          const first = old.pages[0]!
          return {
            ...old,
            pages: [
              { ...first, items: [msg, ...(first.items || [])] },
              ...old.pages.slice(1),
            ],
          }
        },
      )
      // Remove from other folders if present
      ;(['received','sent','deleted'] as const).forEach((f) => {
        if (f === variables.folder) return
        qc.setQueryData<InfiniteData<CursorPaginatedResponse<MailMessage>> | undefined>(
          ['mail', f],
          (old) => {
            if (!old) return old
            const pages = old.pages.map((p): CursorPaginatedResponse<MailMessage> => ({
              ...p,
              items: (p.items || []).filter((m: MailMessage) => m.id !== variables.messageId),
            }))
            return { ...old, pages }
          },
        )
      })
      qc.invalidateQueries({ queryKey: ['mail-message', variables.messageId] })
    },
  })
}

/**
 * Bulk move messages to folder
 */
export function useBulkMoveMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      messageIds,
      folder,
    }: {
      messageIds: string[]
      folder: 'received' | 'sent' | 'deleted'
    }) => {
      const res = await apiClient.post(
        '/mail/bulk-move',
        { messageIds, folder },
        withIdempotencyKey()
      )
      if (!res.success) throw new Error('Failed to move messages')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail'] })
    },
  })
}

/**
 * Restore deleted messages
 */
export function useRestoreMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const res = await apiClient.post(
        '/mail/restore',
        { messageIds },
        withIdempotencyKey()
      )
      if (!res.success) throw new Error('Failed to restore messages')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail'] })
    },
  })
}

/**
 * Permanently delete messages
 */
export function usePermanentlyDeleteMail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const res = await apiClient.post('/mail/permanent-delete', { messageIds }, withIdempotencyKey())
      if (!res.success) throw new Error('Failed to delete messages')
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail'] })
    },
  })
}
