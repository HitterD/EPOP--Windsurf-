/**
 * TanStack Query Caching Policies
 * Different data types have different freshness requirements
 */

export const queryPolicies = {
  // Real-time data (chat messages, presence, typing indicators)
  realtime: {
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000, // Poll every 30s as backup
  },

  // Medium-fresh data (notifications, recent activity)
  mediumFresh: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Static-ish data (user profiles, project details)
  static: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Immutable data (file metadata, historical logs)
  immutable: {
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Analytics/Dashboard data
  analytics: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
}

/**
 * Query key factories for consistent caching
 */
export const queryKeys = {
  // Auth
  auth: {
    session: () => ['auth', 'session'] as const,
    devices: () => ['auth', 'devices'] as const,
  },

  // Chat
  chats: {
    all: () => ['chats'] as const,
    list: (cursor?: string) => ['chats', 'list', cursor] as const,
    detail: (chatId: string) => ['chats', chatId] as const,
    messages: (chatId: string, cursor?: string) => ['chats', chatId, 'messages', cursor] as const,
    typing: (chatId: string) => ['chats', chatId, 'typing'] as const,
  },

  // Projects
  projects: {
    all: () => ['projects'] as const,
    list: (cursor?: string) => ['projects', 'list', cursor] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
    tasks: (projectId: string, cursor?: string) => ['projects', projectId, 'tasks', cursor] as const,
    analytics: (projectId: string, dateRange?: Record<string, unknown>) => ['projects', projectId, 'analytics', dateRange] as const,
  },

  // Files
  files: {
    all: () => ['files'] as const,
    list: (cursor?: string) => ['files', 'list', cursor] as const,
    detail: (fileId: string) => ['files', fileId] as const,
  },

  // Directory
  directory: {
    tree: () => ['directory', 'tree'] as const,
    audit: (contextType?: string, contextId?: string, filters?: Record<string, unknown>) => ['audit', contextType, contextId, filters] as const,
  },

  // Notifications
  notifications: {
    all: () => ['notifications'] as const,
    list: (cursor?: string) => ['notifications', 'list', cursor] as const,
    preferences: () => ['notifications', 'preferences'] as const,
  },

  // Search
  search: {
    global: (query: string, filters?: Record<string, unknown>) => ['search', query, filters] as const,
  },
}
