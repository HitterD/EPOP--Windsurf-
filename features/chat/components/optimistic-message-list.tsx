'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useChatMessageEvents } from '@/lib/socket/hooks/use-chat-events'
import { MessageBubbleEnhanced } from './message-bubble-enhanced'
import { TypingIndicator } from './typing-indicator'
import { ScrollToBottomButton } from './scroll-to-bottom-button'
import { LoadMoreButton } from './load-more-button'
import { Message, type CursorPaginatedResponse } from '@/types'
import { nanoid } from 'nanoid'
import { formatDate } from 'date-fns'

interface OptimisticMessageListProps {
  chatId: string
  messages: Message[]
  currentUserId: string
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  onSendMessage: (content: string, tempId: string) => Promise<void>
}

interface OptimisticMessage extends Message {
  _optimistic?: boolean
  _tempId?: string
  _status?: 'sending' | 'sent' | 'error'
  _error?: string
}

export function OptimisticMessageList({
  chatId,
  messages,
  currentUserId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSendMessage,
}: OptimisticMessageListProps) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<string>()
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, OptimisticMessage>>(new Map())
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)

  // Listen to real-time events and handle them optimistically
  const handleRealTimeEvent = (event: unknown) => {
    const et = (event as { type?: string })?.type
    switch (et) {
      case 'message:new':
        // Server message received - remove any matching optimistic message
        setOptimisticMessages(prev => {
          const updated = new Map(prev)
          // Find and remove optimistic message with same content
          for (const [key, msg] of updated.entries()) {
            const d = (event as { data?: { content?: string; senderId?: string } }).data
            if (d && msg.content === d.content && msg.senderId === d.senderId) {
              updated.delete(key)
            }
          }
          return updated
        })
        break
      
      case 'message:edit':
        // Update message content optimistically
        queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Message>> | undefined>(
          ['chat-messages', chatId],
          (old) => {
            if (!old) return old
            const d = (event as { data?: { messageId: string; content: string } }).data
            if (!d) return old
            return {
              ...old,
              pages: old.pages.map((page): CursorPaginatedResponse<Message> => ({
                ...page,
                items: (page.items || []).map((msg: Message) =>
                  msg.id === d.messageId
                    ? { ...msg, content: d.content, isEdited: true, editedAt: new Date().toISOString() }
                    : msg
                ),
              })),
            }
          },
        )
        break
      
      case 'message:delete':
        // Mark message as deleted optimistically
        queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Message>> | undefined>(
          ['chat-messages', chatId],
          (old) => {
            if (!old) return old
            const d = (event as { data?: { messageId: string } }).data
            if (!d) return old
            return {
              ...old,
              pages: old.pages.map((page): CursorPaginatedResponse<Message> => ({
                ...page,
                items: (page.items || []).map((msg: Message) =>
                  msg.id === d.messageId
                    ? { ...msg, isDeleted: true, content: '[Message deleted]' }
                    : msg
                ),
              })),
            }
          },
        )
        break
      
      case 'message:reaction':
        // Update reactions optimistically
        queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Message>> | undefined>(
          ['chat-messages', chatId],
          (old) => {
            if (!old) return old
            const d = (event as { data?: { messageId: string; emoji: string; userId: string; id?: string } }).data
            if (!d) return old
            return {
              ...old,
              pages: old.pages.map((page): CursorPaginatedResponse<Message> => ({
                ...page,
                items: (page.items || []).map((msg: Message) => {
                  if (msg.id === d.messageId) {
                    const reactions = msg.reactions || []
                    const existingIndex = reactions.findIndex(
                      r => r.userId === d.userId && r.emoji === d.emoji
                    )
                    
                    if (existingIndex >= 0) {
                      // Remove reaction
                      return {
                        ...msg,
                        reactions: reactions.filter((_, i) => i !== existingIndex),
                      }
                    } else {
                      // Add reaction
                      return {
                        ...msg,
                        reactions: [
                          ...reactions,
                          {
                            id: d.id || nanoid(),
                            emoji: d.emoji,
                            userId: d.userId,
                            createdAt: new Date().toISOString(),
                          },
                        ],
                      }
                    }
                  }
                  return msg
                }),
              })),
            }
          },
        )
        break
      
      case 'message:read':
        // Update read receipts optimistically
        queryClient.setQueryData<InfiniteData<CursorPaginatedResponse<Message>> | undefined>(
          ['chat-messages', chatId],
          (old) => {
            if (!old) return old
            const d = (event as { data?: { messageIds?: string[]; userId: string } }).data
            if (!d) return old
            return {
              ...old,
              pages: old.pages.map((page): CursorPaginatedResponse<Message> => ({
                ...page,
                items: (page.items || []).map((msg: Message) => {
                  if (d.messageIds?.includes(msg.id)) {
                    const readBy = msg.readBy || []
                    if (!readBy.includes(d.userId)) {
                      return {
                        ...msg,
                        readBy: [...readBy, d.userId],
                        readCount: (msg.readCount || 0) + 1,
                      }
                    }
                  }
                  return msg
                }),
              })),
            }
          },
        )
        break
    }
  }
  
  // Listen to real-time events  
  useChatMessageEvents(chatId, true)
  
  // Note: For full real-time event handling, you would need to extend useChatMessageEvents
  // to accept a callback parameter. For now, events are handled via query invalidation.

  // Merge server messages with optimistic messages
  const allMessages = [...messages, ...Array.from(optimisticMessages.values())]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // Group messages by date
  const groupedMessages = allMessages.reduce((groups, message) => {
    const date = formatDate(new Date(message.timestamp), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  // Auto-scroll to bottom on new messages (if not user scrolling)
  useEffect(() => {
    if (!isUserScrolling && allMessages.length > 0) {
      const lastMessage = allMessages[allMessages.length - 1]!
      if (lastMessage.id !== lastMessageRef.current) {
        scrollToBottom('smooth')
        lastMessageRef.current = lastMessage.id
      }
    }
  }, [allMessages, isUserScrolling])

  // Detect user scroll
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
      
      setShowScrollBottom(!isAtBottom)
      
      // If user scrolls up, disable auto-scroll
      if (!isAtBottom) {
        setIsUserScrolling(true)
      } else {
        setIsUserScrolling(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior,
    })
    setIsUserScrolling(false)
  }

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  // Add optimistic message
  const addOptimisticMessage = async (content: string) => {
    const tempId = nanoid()
    const now = new Date().toISOString()
    const optimisticMsg: OptimisticMessage = {
      id: tempId,
      chatId,
      content,
      senderId: currentUserId,
      timestamp: now,
      createdAt: now,
      updatedAt: now,
      type: 'text' as const,
      isEdited: false,
      isDeleted: false,
      deliveryPriority: 'normal' as const,
      _optimistic: true,
      _tempId: tempId,
      _status: 'sending',
      reactions: [],
      readBy: [],
      threadCount: 0,
    }

    setOptimisticMessages(prev => new Map(prev).set(tempId, optimisticMsg))

    try {
      await onSendMessage(content, tempId)
      
      // Mark as sent
      setOptimisticMessages(prev => {
        const updated = new Map(prev)
        const msg = updated.get(tempId)
        if (msg) {
          msg._status = 'sent'
        }
        return updated
      })

      // Remove optimistic message after server confirms
      setTimeout(() => {
        setOptimisticMessages(prev => {
          const updated = new Map(prev)
          updated.delete(tempId)
          return updated
        })
      }, 1000)
    } catch (error) {
      // Mark as error
      setOptimisticMessages(prev => {
        const updated = new Map(prev)
        const msg = updated.get(tempId)
        if (msg) {
          msg._status = 'error'
          msg._error = error instanceof Error ? error.message : 'Failed to send'
        }
        return updated
      })
    }
  }

  // Retry failed message
  const retryMessage = async (tempId: string) => {
    const msg = optimisticMessages.get(tempId)
    if (!msg) return

    setOptimisticMessages(prev => {
      const updated = new Map(prev)
      const m = updated.get(tempId)
      if (m) {
        m._status = 'sending'
        delete m._error
      }
      return updated
    })

    try {
      await onSendMessage(msg.content, tempId)
      setOptimisticMessages(prev => {
        const updated = new Map(prev)
        updated.delete(tempId)
        return updated
      })
    } catch (error) {
      setOptimisticMessages(prev => {
        const updated = new Map(prev)
        const m = updated.get(tempId)
        if (m) {
          m._status = 'error'
          m._error = error instanceof Error ? error.message : 'Failed to send'
        }
        return updated
      })
    }
  }

  // Delete failed message
  const deleteOptimisticMessage = (tempId: string) => {
    setOptimisticMessages(prev => {
      const updated = new Map(prev)
      updated.delete(tempId)
      return updated
    })
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Load more button at top */}
      {hasNextPage && (
        <div className="sticky top-0 z-10 flex justify-center p-2">
          <LoadMoreButton
            onClick={onLoadMore ? () => onLoadMore() : () => {}}
            loading={!!isFetchingNextPage}
          />
        </div>
      )}

      {/* Messages container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date} className="mb-4">
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400">
                {formatDate(new Date(date), 'MMMM d, yyyy')}
              </div>
            </div>

            {/* Messages for this date */}
            {msgs.map((message, index) => {
              const isOwn = message.senderId === currentUserId
              const prev = index > 0 ? msgs[index - 1] : undefined
              const showAvatar = index === 0 || prev?.senderId !== message.senderId
              const isOptimistic = (message as OptimisticMessage)._optimistic
              const status = (message as OptimisticMessage)._status
              const error = (message as OptimisticMessage)._error

              return (
                <div
                  key={message.id}
                  className={`mb-2 ${isOptimistic ? 'opacity-70' : 'opacity-100'} transition-opacity`}
                >
                  <MessageBubbleEnhanced
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    showTimestamp={true}
                  />

                  {/* Sending status indicator */}
                  {isOptimistic && status === 'sending' && (
                    <div className="text-xs text-gray-500 ml-12 mt-1">
                      Sending...
                    </div>
                  )}

                  {/* Error state */}
                  {isOptimistic && status === 'error' && (
                    <div className="text-xs text-error ml-12 mt-1 flex items-center gap-2">
                      <span>{error}</span>
                      <button
                        onClick={() => retryMessage((message as OptimisticMessage)._tempId!)}
                        className="underline hover:no-underline"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => deleteOptimisticMessage((message as OptimisticMessage)._tempId!)}
                        className="underline hover:no-underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <TypingIndicator chatId={chatId} currentUserId={currentUserId} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <ScrollToBottomButton onClick={() => scrollToBottom('smooth')} />
      )}

      {/* Expose addOptimisticMessage for parent component */}
      <input
        type="hidden"
        ref={(el) => {
          if (el) {
            (el as unknown as { _addOptimisticMessage: (content: string) => Promise<void> })._addOptimisticMessage = addOptimisticMessage
          }
        }}
      />
    </div>
  )
}
