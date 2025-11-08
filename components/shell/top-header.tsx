'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, Bell, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AvatarWithPresence } from '@/components/ui/presence-badge'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLogout } from '@/lib/api/hooks/use-auth'
import { getInitials } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsAsRead } from '@/lib/api/hooks/use-notifications'
import type { Notification, CursorPaginatedResponse } from '@/types'
import type { InfiniteData } from '@tanstack/react-query'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from 'next-themes'
import { DynamicBreadcrumbs } from './breadcrumbs'

export function TopHeader() {
  const router = useRouter()
  const session = useAuthStore((state) => state.session)
  const { mutate: logout } = useLogout()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: notifData } = useNotifications()
  const notifItems = ((notifData?.pages || []) as Array<CursorPaginatedResponse<Notification>>)
    .flatMap((p) => p.items || [])
  const unreadCount = notifItems.filter((n) => !n.isRead).length
  const latest: Notification[] = notifItems.slice(0, 10)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsAsRead()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleForward = () => {
    router.forward()
  }

  if (!session) return null

  return (
    <TooltipProvider>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go back</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleForward}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go forward</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Breadcrumbs */}
        <DynamicBreadcrumbs />

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search messages, projects, files... (Ctrl+K)"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="text-sm font-medium">Notifications</div>
              <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                Mark all read
              </Button>
            </div>
            <div className="max-h-80 overflow-auto">
              {latest.length === 0 ? (
                <div className="px-2 py-2 text-sm text-muted-foreground">No notifications</div>
              ) : (
                latest.map((n: Notification) => (
                  <div key={n.id} className="flex items-start justify-between gap-2 px-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" title={n.title}>{n.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{n.message}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground/80">{formatDate(n.createdAt, 'relative')}</div>
                    </div>
                    {!n.isRead && (
                      <Button size="sm" variant="outline" onClick={() => markRead.mutate(n.id)}>
                        Read
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="border-t px-2 py-1">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push('/notifications')}>
                View all
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
              <AvatarWithPresence
                {...(session.user.avatar ? { src: session.user.avatar } : {})}
                alt={session.user.name}
                fallback={getInitials(session.user.name)}
                status={session.user.presence}
                size="sm"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
                {session.user.title && (
                  <p className="text-xs text-muted-foreground">{session.user.title}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <span className="mr-2 h-4 w-4">🌓</span>
              Toggle theme
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    </TooltipProvider>
  )
}
