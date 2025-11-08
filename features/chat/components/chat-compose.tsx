'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useChatStore } from '@/lib/stores/chat-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { generateId } from '@/lib/utils'
import { useSendMessage } from '@/lib/api/hooks/use-chats'
import { useTypingIndicator } from '@/lib/socket/hooks/use-chat-events'
import { SafeHtml } from '@/components/ui/safe-html'
import { useFiles } from '@/lib/api/hooks/use-files'
import type { FileItem, CursorPaginatedResponse, Message as ChatMessage } from '@/types'
import type { InfiniteData } from '@tanstack/react-query'
import {
  Send,
  Paperclip,
  Smile,
  Bold,
  Italic,
  List,
  Code,
  AtSign,
  AlertCircle,
  Mail,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatComposeProps {
  chatId: string
}

export function ChatCompose({ chatId }: ChatComposeProps) {
  const currentUser = useAuthStore((state) => state.session?.user)
  const addMessage = useChatStore((state) => state.addMessage)
  const removeMessage = useChatStore((state) => state.removeMessage)
  const { mutateAsync: sendMessage } = useSendMessage(chatId)
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal')
  const [sendAsMail, setSendAsMail] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { startTyping, stopTyping } = useTypingIndicator(
    chatId,
    currentUser?.id || '',
    currentUser?.name || 'Me'
  )

  // Files for quick attachment when sending as mail
  const { data: filesData } = useFiles()
  const fileItems = useMemo(() => {
    const pages = (filesData?.pages || []) as Array<CursorPaginatedResponse<FileItem>>
    return pages.flatMap((p) => p.items || [])
  }, [filesData])

  const handleSend = async () => {
    if (!message.trim() || !currentUser) return

    // FE-10: Send as Mail path
    if (sendAsMail) {
      const [firstLine] = message.trim().split('\n')
      const subject = (firstLine ?? '').slice(0, 120)
      const bodyHtml = message.trim().replace(/\n/g, '<br/>')
      const attParam = selectedAttachments.length
        ? `&attachments=${encodeURIComponent(JSON.stringify(selectedAttachments))}`
        : ''
      stopTyping()
      setMessage('')
      setPriority('normal')
      setSendAsMail(false)
      setSelectedAttachments([])
      setShowFilePicker(false)
      router.push(`/mail/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyHtml)}${attParam}`)
      return
    }

    const tempId = generateId()
    const newMessage = {
      id: tempId,
      chatId,
      senderId: currentUser.id,
      content: message.trim(),
      type: 'text' as const,
      reactions: [],
      isEdited: false,
      isDeleted: false,
      readBy: [currentUser.id],
      deliveryPriority: priority,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Optimistic update
    addMessage(newMessage)

    // Persist via API and reconcile tempId→serverId in store
    try {
      const saved = await sendMessage({ id: tempId, content: newMessage.content, deliveryPriority: newMessage.deliveryPriority })
      if (saved) {
        removeMessage(tempId)
        addMessage(saved as ChatMessage)
      }
    } catch {
      // On failure, remove optimistic message
      removeMessage(tempId)
    }

    // Clear input
    setMessage('')
    setPriority('normal')
    textareaRef.current?.focus()
    stopTyping()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t bg-card p-4">
      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="List">
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Code">
          <Code className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Mention">
          <AtSign className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Emoji">
          <Smile className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {/* Priority selector */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="sm"
                className={priority !== 'normal' ? 'text-orange-500' : ''}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                {priority === 'urgent' ? 'Urgent' : priority === 'important' ? 'Important' : 'Normal'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setPriority('normal')}>
                Normal
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPriority('important')}>
                Important
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPriority('urgent')}>
                Urgent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send as Mail toggle */}
          <Button
            variant={sendAsMail ? 'secondary' : 'ghost'}
            size="sm"
            title="Send as Mail"
            onClick={() => setSendAsMail((v) => !v)}
          >
            <Mail className="mr-2 h-4 w-4" />
            {sendAsMail ? 'Mail on' : 'Mail off'}
          </Button>

          {/* Preview toggle */}
          <Button
            variant={showPreview ? 'secondary' : 'ghost'}
            size="sm"
            title="Preview"
            onClick={() => setShowPreview((v) => !v)}
          >
            Preview
          </Button>

          {/* Attachments quick pick (visible only when send-as-mail) */}
          {sendAsMail && (
            <Button
              variant={showFilePicker ? 'secondary' : 'ghost'}
              size="sm"
              title="Attach from Files"
              onClick={() => setShowFilePicker((v) => !v)}
            >
              Attachments {selectedAttachments.length > 0 ? `(${selectedAttachments.length})` : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            startTyping()
          }}
          onBlur={() => stopTyping()}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] resize-none"
          rows={2}
        />
        
        <div className="flex flex-col gap-2">
          <Button variant="ghost" size="icon" title="Attach file">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim()}
            title="Send message (Enter)"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="mt-2 rounded border bg-card/50 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Preview</div>
          <SafeHtml html={message.replace(/\n/g, '<br/>')} className="prose prose-sm max-w-none" />
        </div>
      )}

      {sendAsMail && showFilePicker && (
        <div className="mt-2 rounded border bg-card/50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Select attachments from Files</span>
            {selectedAttachments.length > 0 && (
              <button
                className="underline hover:no-underline"
                onClick={() => setSelectedAttachments([])}
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {fileItems.map((f: FileItem) => {
              const selected = selectedAttachments.includes(f.url)
              return (
                <div key={f.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium" title={f.name}>{f.name}</div>
                    <div className="text-muted-foreground">{Math.round(f.size / 1024)} KB</div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? 'secondary' : 'outline'}
                    onClick={() =>
                      setSelectedAttachments((prev) =>
                        selected ? prev.filter((u) => u !== f.url) : [...prev, f.url]
                      )
                    }
                  >
                    {selected ? 'Selected' : 'Attach'}
                  </Button>
                </div>
              )
            })}
            {fileItems.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">No files available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
