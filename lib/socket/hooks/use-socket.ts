'use client'

import { useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket } from '../client'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const socketInstance = getSocket()
    setSocket(socketInstance)

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    socketInstance.on('connect', onConnect)
    socketInstance.on('disconnect', onDisconnect)

    return () => {
      socketInstance.off('connect', onConnect)
      socketInstance.off('disconnect', onDisconnect)
    }
  }, [])

  return { socket, isConnected }
}

export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    socket.on(event, handler)

    return () => {
      socket.off(event, handler)
    }
  }, [socket, event, handler])
}
