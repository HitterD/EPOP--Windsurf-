import * as React from 'react'
import Image from 'next/image'
import { cn, getPresenceColor } from '@/lib/utils'
import { PresenceStatus } from '@/types'
import { Badge } from './badge'

interface PresenceBadgeProps {
  status: PresenceStatus
  extension?: string
  showExtension?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
}

export function PresenceBadge({
  status,
  extension,
  showExtension = false,
  size = 'md',
  className,
}: PresenceBadgeProps) {
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <span
        className={cn(
          'rounded-full border-2 border-background',
          getPresenceColor(status),
          sizeClasses[size],
          status === 'available' && 'presence-pulse'
        )}
        aria-label={`Status: ${status}`}
      />
      {showExtension && extension && (
        <Badge variant="outline" className="ml-2 text-xs">
          Ext: {extension}
        </Badge>
      )}
    </div>
  )
}

interface AvatarWithPresenceProps {
  src?: string
  alt: string
  fallback: string
  status: PresenceStatus
  extension?: string
  showExtension?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const avatarSizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

export function AvatarWithPresence({
  src,
  alt,
  fallback,
  status,
  extension,
  showExtension = false,
  size = 'md',
  className,
}: AvatarWithPresenceProps) {
  const sizePx = size === 'sm' ? 32 : size === 'md' ? 40 : 48
  return (
    <div className={cn('relative inline-flex items-center gap-2', className)}>
      <div className="relative">
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-muted text-sm font-medium',
            avatarSizeClasses[size]
          )}
        >
          {src ? (
            <Image
              src={src}
              alt={alt}
              width={sizePx}
              height={sizePx}
              unoptimized
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{fallback}</span>
          )}
        </div>
        <div className="absolute bottom-0 right-0">
          <PresenceBadge status={status} size={size === 'lg' ? 'md' : 'sm'} />
        </div>
      </div>
      {showExtension && extension && (
        <Badge variant="outline" className="text-xs">
          {extension}
        </Badge>
      )}
    </div>
  )
}
