'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/stores/ui-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import {
  Activity,
  MessageSquare,
  FolderKanban,
  Files,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IfCan } from '@/components/auth/if-can'

interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  badge?: number
  adminOnly?: boolean
  shortcut?: string
}

export function LeftRail() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const session = useAuthStore((state) => state.session)

  const navItems: NavItem[] = [
    { name: 'Activity', href: '/dashboard', icon: Activity, shortcut: 'Ctrl+1' },
    { name: 'Chat', href: '/chat', icon: MessageSquare, badge: 3, shortcut: 'Ctrl+2' },
    { name: 'Projects', href: '/projects', icon: FolderKanban, shortcut: 'Ctrl+3' },
    { name: 'Files', href: '/files', icon: Files, shortcut: 'Ctrl+4' },
    { name: 'Directory', href: '/directory', icon: Users, adminOnly: true, shortcut: 'Ctrl+5' },
    { name: 'Admin', href: '/admin', icon: Settings, adminOnly: true, shortcut: 'Ctrl+6' },
  ]

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-card transition-all duration-300',
        sidebarCollapsed ? 'w-rail' : 'w-rail-expanded'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        {!sidebarCollapsed && (
          <h1 className="text-lg font-bold text-teams-purple">EPOP</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          const link = (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge
                        variant={isActive ? 'secondary' : 'default'}
                        className="h-5 min-w-5 px-1.5 text-xs"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {sidebarCollapsed && item.badge && item.badge > 0 && (
                  <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </div>
            </Link>
          )

          if (item.adminOnly) {
            return (
              <IfCan key={item.href} role="admin" permission="admin:access">
                {link}
              </IfCan>
            )
          }

          return link
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-start"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
