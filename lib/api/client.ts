import { API_BASE_URL } from '@/lib/constants'
import { useTraceStore } from '@/lib/stores/trace-store'
import { ApiResponse } from '@/types'

class ApiClient {
  private baseURL: string
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null
  private etagCache: Map<string, string> = new Map()

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async refreshToken(): Promise<boolean> {
    // Prevent multiple refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })

        if (response.ok) {
          return true
        }
        
        // Hard logout on refresh failure
        this.handleAuthFailure()
        return false
      } catch (error) {
        this.handleAuthFailure()
        return false
      } finally {
        this.isRefreshing = false
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  private handleAuthFailure() {
    // Clear auth state and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
  }

  private generateTraceId(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    const randomPart2 = Math.random().toString(36).substring(2, 15)
    return `${timestamp}-${randomPart}-${randomPart2}`
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    // Generate trace ID for observability
    const traceId = this.generateTraceId()
    try {
      useTraceStore.getState().setLastRequestId(traceId)
    } catch {}
    
    // Add If-None-Match header for GET requests with cached ETag
    const cachedEtag = options.method === 'GET' ? this.etagCache.get(url) : undefined
    
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Request-Id': traceId,
      ...(cachedEtag ? { 'If-None-Match': cachedEtag } : {}),
      ...(options.headers as Record<string, string> | undefined),
    }

    const maxAttempts = 3
    let attempt = 0
    let lastError: unknown = null

    while (attempt < maxAttempts) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)

      const config: RequestInit = {
        ...options,
        headers: baseHeaders,
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      }

      try {
        const response = await fetch(url, config)
        clearTimeout(timeout)

        // Handle 304 Not Modified - return cached data
        if (response.status === 304) {
          return {
            success: true,
            data: (null as unknown) as T, // Caller should use cached data
          }
        }

        // Cache ETag for future requests
        const etag = response.headers.get('ETag')
        if (etag && options.method === 'GET') {
          this.etagCache.set(url, etag)
        }

        // Prefer server's request id if provided
        const respTrace = response.headers.get('X-Request-Id') || response.headers.get('x-request-id')
        try {
          useTraceStore.getState().setLastRequestId(respTrace || traceId)
        } catch {}

        if (!response.ok) {
          // Handle 401 Unauthorized - attempt token refresh and retry
          if (response.status === 401 && attempt === 0) {
            const refreshed = await this.refreshToken()
            if (refreshed) {
              // Retry the original request after successful refresh
              attempt++
              continue
            }
            // Refresh failed, return 401 error
            return {
              success: false,
              error: {
                code: '401',
                message: 'Authentication required',
              },
            }
          }

          const isTransient = [408, 429, 500, 502, 503, 504].includes(response.status)
          const error = await response.json().catch(() => ({ message: response.statusText }))
          if (isTransient && attempt < maxAttempts - 1) {
            const backoff = 500 * Math.pow(2, attempt)
            await new Promise((r) => setTimeout(r, backoff))
            attempt++
            continue
          }
          return {
            success: false,
            error: {
              code: response.status.toString(),
              message: error.message || 'An error occurred',
            },
          }
        }

        const data = await response.json()
        return { success: true, data }
      } catch (error) {
        clearTimeout(timeout)
        lastError = error
        const backoff = 500 * Math.pow(2, attempt)
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, backoff))
          attempt++
          continue
        }
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Network error occurred',
          },
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: lastError instanceof Error ? lastError.message : 'Network error occurred',
      },
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    })
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  async upload<T>(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          resolve({ success: true, data })
        } else {
          resolve({
            success: false,
            error: {
              code: xhr.status.toString(),
              message: 'Upload failed',
            },
          })
        }
      })

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'Upload failed',
          },
        })
      })

      xhr.open('POST', `${this.baseURL}${endpoint}`)
      xhr.withCredentials = true
      xhr.send(formData)
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
