/**
 * Loading State Component
 * Wave-2: FE-ux-states
 * Standardized loading feedback with proper accessibility
 */

'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoadingStateProps {
  /** Loading message */
  message?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Full screen overlay */
  fullScreen?: boolean
  /** Additional className */
  className?: string
  /** Show spinner */
  showSpinner?: boolean
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  className,
  showSpinner = true,
}: LoadingStateProps) {
  const sizes = {
    sm: {
      spinner: 'h-4 w-4',
      text: 'text-xs',
      container: 'py-4',
    },
    md: {
      spinner: 'h-8 w-8',
      text: 'text-sm',
      container: 'py-8',
    },
    lg: {
      spinner: 'h-12 w-12',
      text: 'text-base',
      container: 'py-12',
    },
  }

  const sizeClasses = sizes[size]

  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        sizeClasses.container,
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {showSpinner && (
        <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses.spinner)} />
      )}
      <span className={cn('text-muted-foreground', sizeClasses.text)}>
        {message}
      </span>
      {/* Hidden for screen readers */}
      <span className="sr-only">{message}</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}

/**
 * Skeleton loader for content placeholders
 */
export interface SkeletonProps {
  /** Width of skeleton */
  width?: string | number
  /** Height of skeleton */
  height?: string | number
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  /** Additional className */
  className?: string
}

export function Skeleton({ width, height = 16, rounded = 'md', className }: SkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        roundedClasses[rounded],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      role="presentation"
      aria-hidden="true"
    />
  )
}

/**
 * Preset loading skeletons
 */

export function ListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading items">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton width={40} height={40} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <Skeleton width="100%" height={120} />
          <Skeleton width="80%" height={20} />
          <Skeleton width="60%" height={16} />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading table">
      {/* Header */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={`${100 / columns}%`} height={20} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width={`${100 / columns}%`} height={16} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Loading spinner (standalone)
 */
export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <Loader2 
      className={cn('animate-spin text-muted-foreground', sizes[size], className)} 
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Inline loading indicator
 */
export function InlineLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  )
}
