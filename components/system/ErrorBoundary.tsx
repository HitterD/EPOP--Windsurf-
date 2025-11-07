/**
 * FE-Res-2: Enhanced Error Boundary with retry policies
 * Wave-3: FE-obs-errors - Integrated with error tracker
 * Catches rendering errors and provides recovery options
 */

import React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { captureError } from "@/lib/monitoring/error-tracker";

type Props = { 
  fallback?: React.ReactNode
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
  name?: string
}

type State = { 
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retryCount: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Report to error tracking service (Wave-3: FE-obs-errors)
    captureError(error, {
      level: 'error',
      context: {
        component: this.props.name || 'ErrorBoundary',
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      }
    })

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries ?? 3
    
    if (this.state.retryCount < maxRetries) {
      this.setState({ 
        hasError: false,
        retryCount: this.state.retryCount + 1 
      })
    } else {
      // Max retries exceeded, reload page
      window.location.reload()
    }
  }

  handleDismiss = () => {
    this.setState({ 
      hasError: false
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      const { error, retryCount } = this.state
      const maxRetries = this.props.maxRetries ?? 3

      return (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {error?.message || 'An unexpected error occurred in this section.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && error?.stack && (
                <details className="mb-3">
                  <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer mb-2">
                    View error details
                  </summary>
                  <pre className="text-xs bg-red-100 dark:bg-red-950/40 p-2 rounded overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {retryCount >= maxRetries ? 'Reload Page' : 'Try Again'}
                </button>
                
                <button
                  onClick={this.handleDismiss}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Dismiss
                </button>

                {retryCount > 0 && retryCount < maxRetries && (
                  <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                    Attempt {retryCount}/{maxRetries}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
