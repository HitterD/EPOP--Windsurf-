'use client'

import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { getSocket } from '@/lib/socket/client'
import { useConnectionStore } from '@/lib/stores/connection.store'

// util backoff (ms) dengan jitter
export const computeBackoff = (attempt: number, base = 500, max = 15000) => {
  const expo = Math.min(max, base * Math.pow(2, attempt))
  const jitter = Math.random() * 0.2 * expo
  return Math.round(expo + jitter)
}

/**
 * Initialize a single resilient Socket.IO connection at app shell level
 * Manages manual reconnection with exponential backoff and updates global connection store.
 */
export function useResilientSocket(userId?: string, token?: string) {
  const set = useConnectionStore((s) => s.set)
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sockRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!userId) {
      // Do not initiate connection until we have an authenticated user
      return
    }
    const socket = getSocket()
    sockRef.current = socket

    const connect = () => {
      // Prepare auth and connect
      socket.auth = { userId, token }
      attemptsRef.current = attemptsRef.current // no change here
      set({ status: 'connecting', attempts: attemptsRef.current })
      socket.connect()
    }

    const scheduleRetry = () => {
      attemptsRef.current += 1
      const delay = computeBackoff(attemptsRef.current)
      set({ status: 'connecting', attempts: attemptsRef.current })
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        connect()
      }, delay)
    }

    const onConnect = () => {
      attemptsRef.current = 0
      set({ status: 'connected', attempts: 0 })
    }

    const onDisconnect = (reason: string) => {
      set({ status: 'disconnected', lastError: reason })
      scheduleRetry()
    }

    const onConnectError = (err: unknown) => {
      const msg = (err && typeof (err as { message?: unknown }).message === 'string')
        ? String((err as { message: string }).message)
        : 'connect_error'
      set({ status: 'disconnected', lastError: msg })
      scheduleRetry()
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    // Kick initial connect
    connect()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      // Do not nullify singleton socket; just disconnect listeners
    }
  }, [set, userId, token])

  return sockRef
}
