'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '../client'
import { DomainEvent } from '@/types'

export type EventHandler<T extends DomainEvent<unknown>> = (event: T) => void

interface UseDomainEventsOptions<T extends DomainEvent<unknown>> {
  eventType: string
  onEvent: EventHandler<T>
  enabled?: boolean
}

/**
 * Hook to listen to domain events from Socket.IO
 * Handles automatic reconciliation with TanStack Query cache
 */
export function useDomainEvents<T extends DomainEvent<unknown>>({
  eventType,
  onEvent,
  enabled = true,
}: UseDomainEventsOptions<T>) {
  const socket = getSocket()
  const handlerRef = useRef(onEvent)

  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!enabled) return

    const handler = (event: T) => {
      handlerRef.current(event)
    }

    socket.on(eventType, handler)

    return () => {
      socket.off(eventType, handler)
    }
  }, [socket, eventType, enabled])
}

/**
 * Hook to listen to multiple domain events
 */
export function useMultipleDomainEvents<T extends DomainEvent<unknown>>(
  events: Array<{ eventType: string; onEvent: EventHandler<T> }>,
  enabled = true
) {
  const socket = getSocket()
  const eventsRef = useRef(events)

  useEffect(() => {
    eventsRef.current = events
  }, [events])

  useEffect(() => {
    if (!enabled) return

    const handlers = events.map(({ eventType, onEvent }) => {
      const handler = (event: T) => {
        onEvent(event)
      }
      socket.on(eventType, handler)
      return { eventType, handler }
    })

    return () => {
      handlers.forEach(({ eventType, handler }) => {
        socket.off(eventType, handler)
      })
    }
  }, [socket, enabled, events])
}

/**
 * Hook to reconcile domain events with TanStack Query cache
 * Automatically updates cache when events are received
 */
export function useEventReconciliation<T extends DomainEvent<unknown>, D>(
  eventType: string,
  queryKey: readonly unknown[],
  reconcileFn: (event: T, currentData: D) => D,
  enabled = true
) {
  const queryClient = useQueryClient()

  useDomainEvents<T>({
    eventType,
    enabled,
    onEvent: useCallback(
      (event: T) => {
        queryClient.setQueryData<D | undefined>(queryKey, (oldData) => {
          if (!oldData) return oldData
          return reconcileFn(event, oldData)
        })
      },
      [queryClient, queryKey, reconcileFn]
    ),
  })
}

/**
 * Utility to reconcile optimistic updates
 * Maps temporary IDs to server IDs
 */
export function reconcileOptimisticId<T extends { id: string }>(
  items: T[],
  tempId: string,
  serverId: string,
  patch?: Partial<T>
): T[] {
  return items.map((item) => {
    if (item.id === tempId) {
      return { ...item, ...patch, id: serverId }
    }
    return item
  })
}

/**
 * Utility to apply patch updates to items
 */
export function applyPatch<T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>
): T[] {
  return items.map((item) => {
    if (item.id === id) {
      return { ...item, ...patch }
    }
    return item
  })
}

/**
 * Utility to remove items by ID
 */
export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id)
}

/**
 * Utility to add or update item
 */
export function upsertItem<T extends { id: string }>(items: T[], newItem: T): T[] {
  const exists = items.some((item) => item.id === newItem.id)
  if (exists) {
    return items.map((item) => (item.id === newItem.id ? newItem : item))
  }
  return [newItem, ...items]
}
