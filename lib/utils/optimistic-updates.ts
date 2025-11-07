/**
 * Optimistic UI Update Utilities
 * Wave-2: FE-ux-optimistic
 * Handles reconciliation to prevent duplicates and ensure smooth transitions
 */

import { nanoid } from 'nanoid'

/**
 * Optimistic item with temporary ID
 */
export interface OptimisticItem<T> {
  /** The actual data */
  data: T
  /** Temporary ID for optimistic items */
  tempId: string
  /** Whether this is an optimistic (pending) item */
  isPending: boolean
  /** Error if the operation failed */
  error?: Error
  /** Timestamp when created */
  createdAt: number
}

/**
 * Optimistic update options
 */
export interface OptimisticOptions {
  /** Maximum time to keep optimistic items before auto-removing (ms) */
  timeout?: number
  /** Custom ID field name (default: 'id') */
  idField?: string
}

/**
 * Creates an optimistic item wrapper
 */
export function createOptimisticItem<T extends Record<string, any>>(
  data: T,
  options?: OptimisticOptions
): OptimisticItem<T> {
  return {
    data,
    tempId: nanoid(),
    isPending: true,
    createdAt: Date.now(),
  }
}

/**
 * Reconcile optimistic items with server response
 * Prevents duplicates by matching tempId or actual ID
 */
export function reconcileOptimisticItems<T extends Record<string, any>>(
  currentItems: OptimisticItem<T>[],
  newItem: T,
  tempId: string,
  options: OptimisticOptions = {}
): OptimisticItem<T>[] {
  const { idField = 'id' } = options

  return currentItems.map((item) => {
    // Match by temp ID (optimistic item that succeeded)
    if (item.tempId === tempId) {
      return {
        ...item,
        data: newItem,
        isPending: false,
      }
    }

    // Check for duplicate by actual ID (server returned same item)
    if (item.data[idField] && item.data[idField] === newItem[idField]) {
      return {
        ...item,
        data: newItem,
        isPending: false,
      }
    }

    return item
  })
}

/**
 * Remove optimistic item on error
 */
export function markOptimisticItemFailed<T extends Record<string, any>>(
  currentItems: OptimisticItem<T>[],
  tempId: string,
  error: Error
): OptimisticItem<T>[] {
  return currentItems.map((item) =>
    item.tempId === tempId
      ? { ...item, isPending: false, error }
      : item
  )
}

/**
 * Remove failed or timed-out optimistic items
 */
export function cleanupOptimisticItems<T extends Record<string, any>>(
  currentItems: OptimisticItem<T>[],
  options: OptimisticOptions = {}
): OptimisticItem<T>[] {
  const { timeout = 10000 } = options
  const now = Date.now()

  return currentItems.filter((item) => {
    // Remove items with errors
    if (item.error) return false

    // Remove timed-out pending items
    if (item.isPending && now - item.createdAt > timeout) return false

    return true
  })
}

/**
 * Merge new items from server with optimistic items
 * Ensures no duplicates and maintains optimistic items until confirmed
 */
export function mergeWithOptimistic<T extends Record<string, any>>(
  optimisticItems: OptimisticItem<T>[],
  serverItems: T[],
  options: OptimisticOptions = {}
): OptimisticItem<T>[] {
  const { idField = 'id' } = options

  // Create a map of server items by ID
  const serverMap = new Map(
    serverItems
      .filter((item) => item[idField])
      .map((item) => [item[idField], item])
  )

  // Start with optimistic items
  const result: OptimisticItem<T>[] = [...optimisticItems]

  // Add server items that aren't already in optimistic list
  for (const serverItem of serverItems) {
    const serverId = serverItem[idField]
    if (!serverId) continue

    const existsInOptimistic = optimisticItems.some(
      (opt) => opt.data[idField] === serverId
    )

    if (!existsInOptimistic) {
      result.push({
        data: serverItem,
        tempId: nanoid(),
        isPending: false,
        createdAt: Date.now(),
      })
    }
  }

  return result
}

/**
 * Extract confirmed items (not pending)
 */
export function getConfirmedItems<T>(items: OptimisticItem<T>[]): T[] {
  return items
    .filter((item) => !item.isPending && !item.error)
    .map((item) => item.data)
}

/**
 * Extract all items (including optimistic)
 */
export function getAllItems<T>(items: OptimisticItem<T>[]): T[] {
  return items.map((item) => item.data)
}

/**
 * Get pending count
 */
export function getPendingCount<T>(items: OptimisticItem<T>[]): number {
  return items.filter((item) => item.isPending).length
}

/**
 * Hook-friendly optimistic update manager
 */
export class OptimisticManager<T extends Record<string, any>> {
  private items: OptimisticItem<T>[] = []
  private options: OptimisticOptions

  constructor(initialItems: T[] = [], options: OptimisticOptions = {}) {
    this.options = options
    this.items = initialItems.map((data) => ({
      data,
      tempId: nanoid(),
      isPending: false,
      createdAt: Date.now(),
    }))
  }

  /**
   * Add optimistic item
   */
  add(data: T): { tempId: string; items: OptimisticItem<T>[] } {
    const optimisticItem = createOptimisticItem(data, this.options)
    this.items = [optimisticItem, ...this.items]
    return {
      tempId: optimisticItem.tempId,
      items: this.items,
    }
  }

  /**
   * Confirm optimistic item with server data
   */
  confirm(tempId: string, serverData: T): OptimisticItem<T>[] {
    this.items = reconcileOptimisticItems(this.items, serverData, tempId, this.options)
    return this.items
  }

  /**
   * Mark optimistic item as failed
   */
  fail(tempId: string, error: Error): OptimisticItem<T>[] {
    this.items = markOptimisticItemFailed(this.items, tempId, error)
    return this.items
  }

  /**
   * Update from server data
   */
  sync(serverItems: T[]): OptimisticItem<T>[] {
    this.items = mergeWithOptimistic(this.items, serverItems, this.options)
    this.cleanup()
    return this.items
  }

  /**
   * Clean up failed/timed-out items
   */
  cleanup(): OptimisticItem<T>[] {
    this.items = cleanupOptimisticItems(this.items, this.options)
    return this.items
  }

  /**
   * Get current items
   */
  getItems(): OptimisticItem<T>[] {
    return this.items
  }

  /**
   * Get all data (including optimistic)
   */
  getAllData(): T[] {
    return getAllItems(this.items)
  }

  /**
   * Get confirmed data only
   */
  getConfirmedData(): T[] {
    return getConfirmedItems(this.items)
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return getPendingCount(this.items)
  }

  /**
   * Reset to server state
   */
  reset(serverItems: T[]): OptimisticItem<T>[] {
    this.items = serverItems.map((data) => ({
      data,
      tempId: nanoid(),
      isPending: false,
      createdAt: Date.now(),
    }))
    return this.items
  }
}

/**
 * Stable sort helper to prevent flicker
 * Maintains insertion order for items with same sort key
 */
export function stableSort<T>(
  items: T[],
  compareFn: (a: T, b: T) => number
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const comparison = compareFn(a.item, b.item)
      return comparison !== 0 ? comparison : a.index - b.index
    })
    .map(({ item }) => item)
}

/**
 * Debounced state update to prevent rapid re-renders
 */
export function debounceStateUpdate<T>(
  updateFn: (value: T) => void,
  delay: number = 300
): (value: T) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (value: T) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => updateFn(value), delay)
  }
}
