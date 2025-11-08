'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useChatStore } from '@/lib/stores/chat-store'
import { useSocket } from '@/lib/socket/hooks/use-socket'
import { ChatList } from '@/features/chat/components/chat-list'
const VirtualMessageStream = dynamic(
  () => import('@/features/chat/components/virtual-message-stream').then(m => m.VirtualMessageStream),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted/30" /> }
)
import { ChatCompose } from '@/features/chat/components/chat-compose'
import { Message, ChatMessageEvent, type CursorPaginatedResponse } from '@/types'
import { useChats, useChatMessages } from '@/lib/api/hooks/use-chats'
import { useDomainEvents } from '@/lib/socket/hooks/use-domain-events'
import { SOCKET_EVENTS } from '@/lib/constants'
import { ThreadPanel } from '@/features/chat/components/thread-panel'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTypingListener } from '@/lib/socket/hooks/use-chat-events'

export default function ChatDetailPage({ params }: { params: { chatId: string } }) {
  const { socket } = useSocket()
  const chats = useChatStore((state) => Array.from(state.chats.values()))
  const messages = useChatStore((state) => state.messages.get(params.chatId) || [])
  const activeChat = useChatStore((state) => state.chats.get(params.chatId))
  const addMessage = useChatStore((state) => state.addMessage)
  const setMessages = useChatStore((state) => state.setMessages)
  const setActiveChat = useChatStore((state) => state.setActiveChat)
  const clearUnread = useChatStore((state) => state.clearUnread)
  const [threadParent, setThreadParent] = useState<Message | null>(null)
  const me = useAuthStore((s) => s.session?.user)
  const typingUsers = useTypingListener(params.chatId, me?.id || '')

  // Load chats and messages
  useChats()
  const { data: messagePages } = useChatMessages(params.chatId)

  // Sync fetched messages into store
  useEffect(() => {
    const pages = (messagePages?.pages || []) as Array<CursorPaginatedResponse<Message>>
    const items = pages.flatMap((p) => p.items || [])
    if (items.length > 0) {
      setMessages(params.chatId, items)
    }
  }, [messagePages, params.chatId, setMessages])

  // Join chat room
  useEffect(() => {
    if (socket && params.chatId) {
      socket.emit('join_chat', params.chatId)
      setActiveChat(params.chatId)
      clearUnread(params.chatId)

      return () => {
        socket.emit('leave_chat', params.chatId)
      }
    }
  }, [socket, params.chatId, setActiveChat, clearUnread])

  // Listen for new messages via domain events
  useDomainEvents<ChatMessageEvent>({
    eventType: SOCKET_EVENTS.CHAT_MESSAGE_CREATED,
    onEvent: (event: ChatMessageEvent) => {
      const msg = event?.patch as Message
      if (msg?.chatId === params.chatId) {
        const exists = messages.some((m) => m.id === msg.id)
        if (!exists) {
          addMessage(msg)
          clearUnread(params.chatId)
        }
      }
    },
  })

  if (!activeChat) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <ChatList chats={chats} activeChatId={params.chatId} />
      
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex h-14 items-center border-b px-6">
          <h2 className="text-lg font-semibold">{activeChat.name}</h2>
          <div className="ml-auto text-sm text-muted-foreground">
            {activeChat.members.length} members
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            <div className={threadParent ? 'flex-1 border-r' : 'flex-1'}>
              <VirtualMessageStream
                messages={messages}
                chatId={params.chatId}
                onOpenThread={(m) => setThreadParent(m)}
              />
            </div>
            {threadParent && (
              <ThreadPanel
                chatId={params.chatId}
                parent={threadParent}
                onClose={() => setThreadParent(null)}
              />
            )}
          </div>
        </div>

        {/* Compose */}
        {typingUsers.length > 0 && (
          <div className="border-t bg-muted/30 px-6 py-2 text-xs text-muted-foreground">
            {typingUsers.map((t) => t.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}
        <ChatCompose chatId={params.chatId} />
      </div>
    </div>
  )
}
