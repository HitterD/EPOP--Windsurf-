/**
 * Optimistic Update Hook
 * Wave-2: FE-ux-optimistic
 * React hook for managing optimistic UI updates with automatic reconciliation
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { OptimisticManager, OptimisticItem, OptimisticOptions } from '@/lib/utils/optimistic-updates'

export interface UseOptimisticUpdateOptions<T> extends OptimisticOptions {
  /** Initial items */
  initialItems?: T[]
  /** Auto-cleanup interval (ms) */
  cleanupInterval?: number
  /** Callback when item is confirmed */
  onConfirm?: (item: T) => void
  /** Callback when item fails */
  onFail?: (error: Error) => void
}

export interface UseOptimisticUpdateReturn<T> {
  /** All items (including optimistic) */
  items: OptimisticItem<T>[]
  /** Add optimistic item */
  addOptimistic: (data: T) => Promise<string>
  /** Confirm optimistic item with server data */
  confirmOptimistic: (tempId: string, serverData: T) => void
  /** Mark optimistic item as failed */
  failOptimistic: (tempId: string, error: Error) => void
  /** Sync with server data */
  sync: (serverItems: T[]) => void
  /** Reset to server state */
  reset: (serverItems: T[]) => void
  /** Get pending count */
  pendingCount: number
  /** Is any operation pending */
  isPending: boolean
}

/**
 * Hook for managing optimistic UI updates
 * 
 * @example
 * ```tsx
 * const { items, addOptimistic, confirmOptimistic, failOptimistic } = useOptimisticUpdate({
 *   initialItems: messages,
 * })
 * 
 * async function sendMessage(content: string) {
 *   const tempMessage = { id: '', content, userId: currentUserId, createdAt: new Date() }
 *   const tempId = await addOptimistic(tempMessage)
 *   
 *   try {
 *     const serverMessage = await api.sendMessage(content)
 *     confirmOptimistic(tempId, serverMessage)
 *   } catch (error) {
 *     failOptimistic(tempId, error)
 *   }
 * }
 * ```
 */
export function useOptimisticUpdate<T extends Record<string, any>>(
  options: UseOptimisticUpdateOptions<T> = {}
): UseOptimisticUpdateReturn<T> {
  const {
    initialItems = [],
    cleanupInterval = 5000,
    onConfirm,
    onFail,
    ...optimisticOptions
  } = options

  const managerRef = useRef<OptimisticManager<T>>(
    new OptimisticManager(initialItems, optimisticOptions)
  )

  const [items, setItems] = useState<OptimisticItem<T>[]>(() =>
    managerRef.current.getItems()
  )

  // Auto-cleanup interval
  useEffect(() => {
    if (!cleanupInterval) return

    const interval = setInterval(() => {
      const cleaned = managerRef.current.cleanup()
      setItems(cleaned)
    }, cleanupInterval)

    return () => clearInterval(interval)
  }, [cleanupInterval])

  const addOptimistic = useCallback(
    async (data: T): Promise<string> => {
      const { tempId, items: updatedItems } = managerRef.current.add(data)
      setItems(updatedItems)
      return tempId
    },
    []
  )

  const confirmOptimistic = useCallback(
    (tempId: string, serverData: T) => {
      const updatedItems = managerRef.current.confirm(tempId, serverData)
      setItems(updatedItems)
      onConfirm?.(serverData)
    },
    [onConfirm]
  )

  const failOptimistic = useCallback(
    (tempId: string, error: Error) => {
      const updatedItems = managerRef.current.fail(tempId, error)
      setItems(updatedItems)
      onFail?.(error)
    },
    [onFail]
  )

  const sync = useCallback((serverItems: T[]) => {
    const updatedItems = managerRef.current.sync(serverItems)
    setItems(updatedItems)
  }, [])

  const reset = useCallback((serverItems: T[]) => {
    const updatedItems = managerRef.current.reset(serverItems)
    setItems(updatedItems)
  }, [])

  const pendingCount = managerRef.current.getPendingCount()
  const isPending = pendingCount > 0

  return {
    items,
    addOptimistic,
    confirmOptimistic,
    failOptimistic,
    sync,
    reset,
    pendingCount,
    isPending,
  }
}

/**
 * Simpler hook for single optimistic action (e.g., form submission)
 */
export interface UseOptimisticActionOptions<TInput, TResult> {
  /** The async action to perform */
  action: (input: TInput) => Promise<TResult>
  /** Callback when action succeeds */
  onSuccess?: (result: TResult) => void
  /** Callback when action fails */
  onError?: (error: Error) => void
}

export interface UseOptimisticActionReturn<TInput, TResult> {
  /** Execute the action optimistically */
  execute: (input: TInput) => Promise<TResult | null>
  /** Is action in progress */
  isPending: boolean
  /** Error if action failed */
  error: Error | null
  /** Result if action succeeded */
  result: TResult | null
  /** Reset state */
  reset: () => void
}

/**
 * Hook for single optimistic action
 * 
 * @example
 * ```tsx
 * const { execute, isPending, error } = useOptimisticAction({
 *   action: async (content: string) => api.createPost(content),
 *   onSuccess: (post) => toast.success('Post created'),
 *   onError: (error) => toast.error(error.message),
 * })
 * 
 * async function handleSubmit() {
 *   await execute(formData.content)
 * }
 * ```
 */
export function useOptimisticAction<TInput, TResult>({
  action,
  onSuccess,
  onError,
}: UseOptimisticActionOptions<TInput, TResult>): UseOptimisticActionReturn<TInput, TResult> {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<TResult | null>(null)

  const execute = useCallback(
    async (input: TInput): Promise<TResult | null> => {
      setIsPending(true)
      setError(null)
      setResult(null)

      try {
        const result = await action(input)
        setResult(result)
        setIsPending(false)
        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        setIsPending(false)
        onError?.(error)
        return null
      }
    },
    [action, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setIsPending(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    execute,
    isPending,
    error,
    result,
    reset,
  }
}

/**
 * Hook for optimistic list mutations (add, update, delete)
 */
export interface UseOptimisticListOptions<T> {
  /** Initial items */
  items: T[]
  /** ID field name */
  idField?: string
}

export function useOptimisticList<T extends Record<string, any>>({
  items: serverItems,
  idField = 'id',
}: UseOptimisticListOptions<T>) {
  const { items, addOptimistic, confirmOptimistic, failOptimistic, sync } =
    useOptimisticUpdate<T>({
      initialItems: serverItems,
      idField,
    })

  // Sync when server items change
  useEffect(() => {
    sync(serverItems)
  }, [serverItems, sync])

  const addItem = useCallback(
    async (
      item: T,
      serverAction: (item: T) => Promise<T>
    ): Promise<T | null> => {
      const tempId = await addOptimistic(item)

      try {
        const serverItem = await serverAction(item)
        confirmOptimistic(tempId, serverItem)
        return serverItem
      } catch (error) {
        failOptimistic(tempId, error as Error)
        return null
      }
    },
    [addOptimistic, confirmOptimistic, failOptimistic]
  )

  const updateItem = useCallback(
    async (
      id: string | number,
      updates: Partial<T>,
      serverAction: (id: string | number, updates: Partial<T>) => Promise<T>
    ): Promise<T | null> => {
      const existingItem = items.find((item) => item.data[idField] === id)
      if (!existingItem) return null

      const optimisticItem = { ...existingItem.data, ...updates }
      const tempId = await addOptimistic(optimisticItem)

      try {
        const serverItem = await serverAction(id, updates)
        confirmOptimistic(tempId, serverItem)
        return serverItem
      } catch (error) {
        failOptimistic(tempId, error as Error)
        return null
      }
    },
    [items, idField, addOptimistic, confirmOptimistic, failOptimistic]
  )

  const deleteItem = useCallback(
    async (
      id: string | number,
      serverAction: (id: string | number) => Promise<void>
    ): Promise<boolean> => {
      // Mark as deleting optimistically
      const filteredItems = items.filter(
        (item) => item.data[idField] !== id
      )

      try {
        await serverAction(id)
        sync(filteredItems.map((item) => item.data))
        return true
      } catch (error) {
        // Revert on error
        sync(serverItems)
        return false
      }
    },
    [items, idField, serverItems, sync]
  )

  return {
    items: items.map((item) => item.data),
    optimisticItems: items,
    addItem,
    updateItem,
    deleteItem,
  }
}
