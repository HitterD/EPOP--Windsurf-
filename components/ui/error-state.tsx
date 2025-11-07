/**
 * Error State Component
 * Wave-2: FE-ux-states
 * Standardized error feedback with recovery actions
 */

'use client'

import React from 'react'
import { AlertCircle, WifiOff, ServerCrash, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from './alert'

export interface ErrorStateProps {
  /** Error title */
  title: string
  /** Error description */
  description?: string
  /** Error code (e.g., 404, 500) */
  code?: string | number
  /** Retry action */
  onRetry?: () => void
  /** Go back action */
  onGoBack?: () => void
  /** Custom action */
  action?: {
    label: string
    onClick: () => void
  }
  /** Error type for preset styling */
  type?: 'error' | 'warning' | 'network' | 'server' | 'notFound'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
  /** Show as inline alert instead of full state */
  inline?: boolean
}

const errorIcons = {
  error: XCircle,
  warning: AlertTriangle,
  network: WifiOff,
  server: ServerCrash,
  notFound: AlertCircle,
}

export function ErrorState({
  title,
  description,
  code,
  onRetry,
  onGoBack,
  action,
  type = 'error',
  size = 'md',
  className,
  inline = false,
}: ErrorStateProps) {
  const Icon = errorIcons[type]

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

  // Inline variant
  if (inline) {
    return (
      <Alert variant="destructive" className={className}>
        <Icon className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
        {(onRetry || action) && (
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
            {action && (
              <Button variant="outline" size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
          </div>
        )}
      </Alert>
    )
  }

  // Full state variant
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses.container,
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div
        className={cn(
          'mx-auto mb-4 rounded-full p-3',
          type === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-500' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-500',
          sizeClasses.icon
        )}
      >
        <Icon className="h-full w-full" />
      </div>

      {/* Code */}
      {code && (
        <div className="mb-2 text-xs font-mono text-muted-foreground">
          Error {code}
        </div>
      )}

      {/* Title */}
      <h3 className={cn('text-foreground', sizeClasses.title)}>{title}</h3>

      {/* Description */}
      {description && (
        <p className={cn('mt-2 max-w-sm text-muted-foreground', sizeClasses.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(onRetry || onGoBack || action) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              Try again
            </Button>
          )}
          {action && (
            <Button onClick={action.onClick} variant="default">
              {action.label}
            </Button>
          )}
          {onGoBack && (
            <Button variant="outline" onClick={onGoBack}>
              Go back
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Preset error states
 */

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      type="network"
      title="Connection lost"
      description="Please check your internet connection and try again"
      {...(onRetry ? { onRetry } : {})}
    />
  )
}

export function ServerError({ onRetry, code = 500 }: { onRetry?: () => void; code?: number }) {
  return (
    <ErrorState
      type="server"
      code={code}
      title="Something went wrong"
      description="We're having trouble loading this page. Please try again."
      {...(onRetry ? { onRetry } : {})}
    />
  )
}

export function NotFoundError({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <ErrorState
      type="notFound"
      code={404}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved"
      {...(onGoBack ? { onGoBack } : {})}
    />
  )
}

export function ValidationError({ 
  message, 
  onDismiss 
}: { 
  message: string
  onDismiss?: () => void 
}) {
  return (
    <ErrorState
      type="warning"
      title="Validation error"
      description={message}
      inline
      {...(onDismiss
        ? {
            action: {
              label: 'Dismiss',
              onClick: onDismiss,
            },
          }
        : {})}
    />
  )
}

export function PermissionError() {
  return (
    <ErrorState
      type="warning"
      code={403}
      title="Access denied"
      description="You don't have permission to access this resource"
      size="md"
    />
  )
}

/**
 * Error boundary fallback
 */
export interface ErrorBoundaryFallbackProps {
  error: Error
  resetError: () => void
}

export function ErrorBoundaryFallback({ error, resetError }: ErrorBoundaryFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="w-full max-w-md">
        <ErrorState
          type="error"
          title="Something went wrong"
          description={
            isDevelopment
              ? error.message
              : 'An unexpected error occurred. Please try refreshing the page.'
          }
          onRetry={resetError}
          size="lg"
        />
        {isDevelopment && error.stack && (
          <details className="mt-4 rounded-lg border p-4 text-xs">
            <summary className="cursor-pointer font-mono font-semibold">
              Stack trace
            </summary>
            <pre className="mt-2 overflow-auto text-muted-foreground">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
