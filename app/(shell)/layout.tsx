'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Inter } from 'next/font/google'
import { LeftRail } from '@/components/shell/left-rail'
import { TopHeader } from '@/components/shell/top-header'
import { CommandPalette } from '@/components/shell/command-palette'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Toaster, toast } from 'sonner'
import { useDomainEvents } from '@/lib/socket/hooks/use-domain-events'
import { SOCKET_EVENTS } from '@/lib/constants'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/system/ErrorBoundary'
import ConnectionBanner from '@/components/system/ConnectionBanner'
import { useResilientSocket } from '@/lib/socket/hooks/use-resilient-socket'
import { Providers } from '@/components/providers/providers'
import { SkipLinks } from '@/components/accessibility/skip-link'
import { StatusAnnouncer } from '@/components/accessibility/aria-live'
import type { ChatMessageEvent, DomainEvent, Notification, CursorPaginatedResponse } from '@/types'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
export default function ShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { session, isAuthenticated, isLoading } = useAuthStore()
  const qc = useQueryClient()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Initialize resilient Socket.IO connection once at shell level
  useResilientSocket(session?.user?.id, '')

  useDomainEvents<ChatMessageEvent>({
    eventType: SOCKET_EVENTS.CHAT_MESSAGE_CREATED,
    onEvent: (event: ChatMessageEvent) => {
      const msg = event?.patch
      toast('New message', {
        description: msg?.content || 'You have a new message',
        action: msg?.chatId
          ? {
              label: 'Open',
              onClick: () => router.push(`/chat/${msg.chatId}`),
            }
          : undefined,
      })
    },
  })

  useDomainEvents<DomainEvent<Notification>>({
    eventType: SOCKET_EVENTS.NOTIFICATION_CREATED,
    onEvent: (event: DomainEvent<Notification>) => {
      const n = event?.patch
      toast(n?.title || 'Notification', {
        description: n?.message,
        action: n?.actionUrl
          ? {
              label: 'Open',
              onClick: () => router.push(n.actionUrl!),
            }
          : undefined,
      })
      if (!n) return
      qc.setQueryData<InfiniteData<CursorPaginatedResponse<Notification>> | undefined>(
        ['notifications'],
        (old) => {
          if (!old || old.pages.length === 0) return old
          const firstPage = old.pages[0]!
          let updatedFirst: CursorPaginatedResponse<Notification> = {
            items: [n as Notification, ...(firstPage.items || [])],
            hasMore: firstPage.hasMore,
          }
          if (firstPage.nextCursor !== undefined) {
            updatedFirst = { ...updatedFirst, nextCursor: firstPage.nextCursor }
          }
          if (firstPage.total !== undefined) {
            updatedFirst = { ...updatedFirst, total: firstPage.total }
          }
          return {
            ...old,
            pages: [updatedFirst, ...old.pages.slice(1)],
          }
        }
      )
    },
  })

  return (
    <Providers>
      {isLoading || !isAuthenticated ? (
        <div className={`flex h-screen items-center justify-center ${inter.className}`}>
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        <div className={`flex h-screen overflow-hidden bg-background ${inter.className}`}>
          {/* FE-a11y-2: Skip navigation links */}
          <SkipLinks />
          
          {/* FE-a11y-3: Status announcer for screen readers */}
          <StatusAnnouncer />
          
          <ErrorBoundary fallback={<div className="p-3">Sidebar bermasalah.</div>}>
            <LeftRail />
          </ErrorBoundary>
          <div className="flex flex-1 flex-col overflow-hidden">
            <ConnectionBanner />
            <TopHeader />
            <ErrorBoundary fallback={<div className="p-6">Konten gagal dimuat.</div>}>
              <main id="main-content" className="flex-1 overflow-hidden" tabIndex={-1}>
                {children}
              </main>
            </ErrorBoundary>
            <Toaster richColors />
          </div>
          <CommandPalette />
        </div>
      )}
    </Providers>
  )
}

