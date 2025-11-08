import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'

/**
 * Configure TanStack Query with optimized defaults for performance
 * FE-Perf-3: Enhanced query configuration with cursor pagination support
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handling
      console.error('Query error:', error, query.queryKey)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Global mutation error handling
      console.error('Mutation error:', error, mutation.options.mutationKey)
    },
  }),
  defaultOptions: {
    queries: {
      // Stale-while-revalidate strategy - per entity type
      staleTime: 60_000, // 1 minute default
      gcTime: 300_000, // 5 minutes cache time
      
      // Refetch configuration
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      
      // Retry configuration with exponential backoff
      retry: (failureCount: number, error: unknown) => {
        // Don't retry on 4xx errors (client errors)
        const status = (error as { response?: { status?: number } })?.response?.status
        if (typeof status === 'number' && status >= 400 && status < 500) {
          return false
        }
        // Retry up to 3 times for 5xx errors
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      
      // Network mode
      networkMode: 'online',
      
      // Enable structural sharing for better performance
      structuralSharing: true,
      
      // Deduplication - dedupe identical requests
      refetchInterval: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
})

/**
 * Entity-specific stale time configurations
 * Optimized based on data update frequency
 */
export const STALE_TIME = {
  // Real-time data - refresh frequently
  messages: 10_000, // 10 seconds
  notifications: 10_000,
  typing: 3_000, // 3 seconds
  presence: 30_000, // 30 seconds
  
  // Moderate update frequency
  chats: 30_000,
  projects: 60_000, // 1 minute
  tasks: 60_000,
  
  // Rarely changing data
  users: 300_000, // 5 minutes
  directory: 300_000,
  files: 120_000, // 2 minutes
  
  // Static data
  currentUser: Infinity, // Never stale until invalidated
  preferences: Infinity,
} as const

/**
 * GC time configurations - how long to keep unused data in cache
 */
export const GC_TIME = {
  default: 300_000, // 5 minutes
  extended: 600_000, // 10 minutes for expensive queries
  short: 60_000, // 1 minute for real-time data
} as const

/**
 * Query key factories for consistent cache keys
 */
export const queryKeys = {
  // Auth
  auth: {
    me: ['currentUser'] as const,
    sessions: ['sessions'] as const,
  },
  
  // Chats
  chats: {
    all: ['chats'] as const,
    detail: (id: string) => ['chat', id] as const,
    messages: (id: string) => ['chat-messages', id] as const,
    thread: (chatId: string, messageId: string) => ['thread-messages', chatId, messageId] as const,
    typing: (id: string) => ['chat-typing', id] as const,
  },
  
  // Projects
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['project', id] as const,
    tasks: (id: string) => ['project-tasks', id] as const,
    buckets: (id: string) => ['project-buckets', id] as const,
  },
  
  // Files
  files: {
    all: ['files'] as const,
    detail: (id: string) => ['file', id] as const,
  },
  
  // Mail
  mail: {
    folder: (folder: string) => ['mail', folder] as const,
    detail: (id: string) => ['mail-message', id] as const,
  },
  
  // Directory
  directory: {
    tree: ['org-tree'] as const,
    audit: ['directory-audit'] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['unread-count'] as const,
    preferences: ['notification-preferences'] as const,
  },
  
  // Search
  search: {
    query: (params: Record<string, unknown>) => ['search', params] as const,
  },
}

/**
 * Helper to prefetch query
 */
export async function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  })
}

/**
 * Helper to invalidate queries by pattern
 */
export function invalidateQueriesByPattern(pattern: readonly unknown[]) {
  return queryClient.invalidateQueries({
    queryKey: pattern,
  })
}

/**
 * Helper to set query data
 */
export function setQueryData<T>(queryKey: readonly unknown[], data: T) {
  queryClient.setQueryData(queryKey, data)
}

/**
 * Helper to get query data
 */
export function getQueryData<T>(queryKey: readonly unknown[]): T | undefined {
  return queryClient.getQueryData(queryKey)
}

/**
 * Clear all queries from cache
 */
export function clearAllQueries() {
  queryClient.clear()
}

/**
 * Remove specific query from cache
 */
export function removeQuery(queryKey: readonly unknown[]) {
  queryClient.removeQueries({ queryKey })
}
