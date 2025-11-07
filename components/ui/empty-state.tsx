/**
 * Empty State Component
 * Wave-2: FE-ux-states
 * Standardized empty state feedback across all features
 */

'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Custom illustration */
  illustration?: React.ReactNode
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  size = 'md',
  className,
}: EmptyStateProps) {
  const sizes = {
    sm: {
      container: 'py-6',
      icon: 'h-8 w-8',
      title: 'text-sm font-medium',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-lg font-semibold',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-xl font-semibold',
      description: 'text-base',
    },
  }

  const sizeClasses = sizes[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses.container,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon or Illustration */}
      <div className="mb-4">
        {illustration ? (
          illustration
        ) : Icon ? (
          <div
            className={cn(
              'mx-auto rounded-full bg-muted p-3 text-muted-foreground',
              sizeClasses.icon
            )}
          >
            <Icon className="h-full w-full" />
          </div>
        ) : null}
      </div>

      {/* Title */}
      <h3 className={cn('text-foreground', sizeClasses.title)}>{title}</h3>

      {/* Description */}
      {description && (
        <p className={cn('mt-2 max-w-sm text-muted-foreground', sizeClasses.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Preset empty states for common scenarios
 */

export function NoSearchResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      title="No results found"
      description="Try adjusting your search terms or filters"
      {...(onClear
        ? {
            secondaryAction: {
              label: 'Clear filters',
              onClick: onClear,
            },
          }
        : {})}
    />
  )
}

export function NoDataYet({
  entityName,
  onCreate,
  createLabel,
}: {
  entityName: string
  onCreate?: () => void
  createLabel?: string
}) {
  return (
    <EmptyState
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.toLowerCase()}`}
      {...(onCreate
        ? {
            action: {
              label: createLabel || `Create ${entityName}`,
              onClick: onCreate,
            },
          }
        : {})}
    />
  )
}

export function NoAccess() {
  return (
    <EmptyState
      title="Access denied"
      description="You don't have permission to view this content"
      size="md"
    />
  )
}

export function NotFound({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <EmptyState
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved"
      {...(onGoBack
        ? {
            secondaryAction: {
              label: 'Go back',
              onClick: onGoBack,
            },
          }
        : {})}
      size="lg"
    />
  )
}
