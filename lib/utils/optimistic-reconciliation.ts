/**
 * FE-Res-1: Optimistic UI Reconciliation Utility
 * Handles clientTempId → serverId mapping for reliable optimistic updates
 */

import { queryClient } from '@/lib/config/query-client'

export interface OptimisticItem {
  id: string
  _optimistic?: boolean
  _tempId?: string
  _status?: 'sending' | 'sent' | 'error'
  _error?: string
  [key: string]: unknown
}

/**
 * Generate unique temp ID for optimistic items
 */
export function generateTempId(prefix: string = 'temp'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Optimistic update reconciliation manager
 */
export class OptimisticReconciler<T extends OptimisticItem> {
  private pendingMap = new Map<string, T>()
  private queryKey: readonly unknown[]

  constructor(queryKey: readonly unknown[]) {
    this.queryKey = queryKey
  }

  /**
   * Add optimistic item to cache
   */
  addOptimistic(item: T): void {
    const tempId = item._tempId || item.id

    // Store in pending map
    this.pendingMap.set(tempId, { ...item, _optimistic: true, _status: 'sending' })

    // Update query cache
    queryClient.setQueryData(this.queryKey, (old: unknown) => {
      if (!old) return old
      if (isInfinite<T>(old)) {
        const data = old
        return {
          ...data,
          pages: data.pages.map((page: InfinitePage<T>, index: number) => {
            if (index === 0) {
              return {
                ...page,
                items: [ ...(page.items || []), { ...item, _optimistic: true } ],
              }
            }
            return page
          }),
        }
      }
      if (Array.isArray(old)) {
        return [...old, { ...item, _optimistic: true }]
      }
      return old
    })
  }

  /**
   * Reconcile optimistic item with server response
   * Maps clientTempId → serverId
   */
  reconcile(tempId: string, serverItem: T): void {
    const optimisticItem = this.pendingMap.get(tempId)
    if (!optimisticItem) return

    // Mark as sent
    this.pendingMap.set(tempId, { ...optimisticItem, _status: 'sent' })

    // Update query cache - replace temp item with server item
    queryClient.setQueryData(this.queryKey, (old: unknown) => {
      if (!old) return old
      if (isInfinite<T>(old)) {
        const data = old
        return {
          ...data,
          pages: data.pages.map((page: InfinitePage<T>) => ({
            ...page,
            items: (page.items || []).map((it: unknown) =>
              (it as T)._tempId === tempId || (it as T).id === tempId
                ? { ...(serverItem as T), _optimistic: false }
                : (it as T)
            ),
          })),
        }
      }
      if (Array.isArray(old)) {
        return (old as T[]).map((it: T) =>
          it._tempId === tempId || it.id === tempId
            ? { ...(serverItem as T), _optimistic: false }
            : it
        )
      }
      return old
    })

    // Clean up after delay
    setTimeout(() => {
      this.pendingMap.delete(tempId)
      this.cleanup(tempId)
    }, 1000)
  }

  /**
   * Mark optimistic item as failed
   */
  markFailed(tempId: string, error: string): void {
    const item = this.pendingMap.get(tempId)
    if (!item) return

    this.pendingMap.set(tempId, { ...item, _status: 'error', _error: error })

    // Update query cache with error status
    queryClient.setQueryData(this.queryKey, (old: unknown) => {
      if (!old) return old
      if (isInfinite<T>(old)) {
        const data = old
        return {
          ...data,
          pages: data.pages.map((page: InfinitePage<T>) => ({
            ...page,
            items: (page.items || []).map((it: unknown) =>
              (it as T)._tempId === tempId || (it as T).id === tempId
                ? { ...(it as T), _status: 'error', _error: error }
                : (it as T)
            ),
          })),
        }
      }
      if (Array.isArray(old)) {
        return (old as T[]).map((it: T) =>
          it._tempId === tempId || it.id === tempId
            ? { ...it, _status: 'error', _error: error }
            : it
        )
      }
      return old
    })
  }

  /**
   * Retry failed optimistic update
   */
  retry(tempId: string, retryFn: () => Promise<T>): Promise<void> {
    const item = this.pendingMap.get(tempId)
    if (!item) return Promise.reject(new Error('Item not found'))

    // Reset status to sending
    this.pendingMap.set(tempId, { ...item, _status: 'sending', _error: undefined })

    queryClient.setQueryData(this.queryKey, (old: unknown) => {
      if (!old) return old
      if (isInfinite<T>(old)) {
        const data = old
        return {
          ...data,
          pages: data.pages.map((page: InfinitePage<T>) => ({
            ...page,
            items: (page.items || []).map((it: unknown) =>
              (it as T)._tempId === tempId
                ? { ...(it as T), _status: 'sending', _error: undefined }
                : (it as T)
            ),
          })),
        }
      }
      if (Array.isArray(old)) {
        return (old as T[]).map((it: T) =>
          it._tempId === tempId
            ? { ...it, _status: 'sending', _error: undefined }
            : it
        )
      }
      return old
    })

    return retryFn()
      .then((serverItem) => {
        this.reconcile(tempId, serverItem)
      })
      .catch((error) => {
        this.markFailed(tempId, error.message || 'Retry failed')
        throw error
      })
  }

  /**
   * Remove optimistic item (on user delete action)
   */
  remove(tempId: string): void {
    this.pendingMap.delete(tempId)
    this.cleanup(tempId)
  }

  /**
   * Clean up optimistic item from cache
   */
  private cleanup(tempId: string): void {
    queryClient.setQueryData(this.queryKey, (old: unknown) => {
      if (!old) return old
      if (isInfinite<T>(old)) {
        const data = old
        return {
          ...data,
          pages: data.pages.map((page: InfinitePage<T>) => ({
            ...page,
            items: (page.items || []).filter((it: unknown) =>
              (it as T)._tempId !== tempId && (it as T).id !== tempId
            ),
          })),
        }
      }
      if (Array.isArray(old)) {
        return (old as T[]).filter((it: T) => it._tempId !== tempId && it.id !== tempId)
      }
      return old
    })
  }

  /**
   * Get all pending optimistic items
   */
  getPending(): Map<string, T> {
    return new Map(this.pendingMap)
  }

  /**
   * Check if there are any pending items
   */
  hasPending(): boolean {
    return this.pendingMap.size > 0
  }

  /**
   * Clear all pending items
   */
  clear(): void {
    this.pendingMap.clear()
  }
}

/**
 * Hook for optimistic reconciliation
 */
export function useOptimisticReconciler<T extends OptimisticItem>(
  queryKey: readonly unknown[]
) {
  const reconciler = new OptimisticReconciler<T>(queryKey)
  return reconciler
}

type InfinitePage<T> = { items?: T[] } & Record<string, unknown>
type InfiniteResult<T> = { pages: Array<InfinitePage<T>>; pageParams?: unknown[] } & Record<string, unknown>
function isInfinite<T>(v: unknown): v is InfiniteResult<T> {
  return !!v && typeof v === 'object' && 'pages' in (v as Record<string, unknown>) && Array.isArray((v as { pages?: unknown }).pages)
}
