// User & Auth Types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  title?: string
  department?: string
  extension?: string
  role: UserRole
  permissions: Permission[]
  presence: PresenceStatus
  createdAt: string
  updatedAt: string
}

export type UserRole = 'admin' | 'member' | 'guest'

export type Permission = 
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'chat:create'
  | 'chat:read'
  | 'chat:moderate'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'directory:read'
  | 'directory:update'
  | 'file:upload'
  | 'file:read'
  | 'file:delete'
  | 'admin:access'

export type PresenceStatus = 'available' | 'busy' | 'away' | 'offline'

export interface AuthSession {
  user: User
  expiresAt: number
}

export interface UserSession {
  id: string
  userId: string
  deviceName: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'other'
  ipAddress: string
  userAgent: string
  lastActiveAt: string
  createdAt: string
  isCurrent: boolean
}

// Chat Types
export interface Chat {
  id: string
  type: 'direct' | 'group'
  name?: string
  avatar?: string
  members: string[]
  lastMessage?: Message
  unreadCount: number
  isPinned: boolean
  isMuted: boolean
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  sender?: {
    id: string
    name: string
    avatar?: string
    presence?: PresenceStatus
  }
  content: string
  type: 'text' | 'file' | 'system'
  attachments?: Attachment[]
  reactions?: Reaction[]
  reactionsSummary?: ReactionSummary[]
  threadId?: string
  threadCount?: number
  isEdited: boolean
  edited?: boolean // Alias for isEdited
  isDeleted: boolean
  readBy: string[]
  readCount?: number
  deliveryPriority: 'normal' | 'important' | 'urgent'
  scheduledFor?: string
  timestamp: string // Alias for createdAt
  createdAt: string
  updatedAt: string
  editedAt?: string
}

export interface ReactionSummary {
  emoji: string
  count: number
  userIds: string[]
  hasCurrentUser?: boolean
}

export interface Reaction {
  emoji: string
  userId: string
  createdAt: string
}

export interface Thread {
  id: string
  parentMessageId: string
  parentMessage?: Message
  messages: Message[]
  participantIds: string[]
  replyCount: number
  lastReplyAt?: string
  createdAt: string
  updatedAt: string
}

export interface TypingState {
  chatId: string
  userId: string
  userName: string
  timestamp: string
}

export interface ChatPresence {
  chatId: string
  onlineUserIds: string[]
  typingUsers: TypingState[]
}

// Mail Types
export interface MailMessage {
  id: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  snippet?: string // Preview text
  attachments?: Attachment[]
  folder: 'received' | 'sent' | 'deleted'
  date: string // Alias for createdAt
  isRead: boolean
  isStarred: boolean
  labels?: string[] // Labels for categorization
  priority: 'normal' | 'important' | 'urgent'
  createdAt: string
  updatedAt: string
}

// Alias for backward compatibility
export type MailItem = MailMessage

// Project Types
export interface Project {
  id: string
  name: string
  description?: string
  color: string
  ownerId: string
  memberIds: string[]
  buckets: Bucket[]
  createdAt: string
  updatedAt: string
}

export interface Bucket {
  id: string
  projectId: string
  name: string
  color?: 'gray' | 'blue' | 'green' | 'purple'
  order: number
  tasks: Task[]
}

export interface Task {
  id: string
  projectId: string
  bucketId: string
  title: string
  description?: string
  assigneeIds: string[]
  assignees?: Array<{
    id: string
    name: string
    avatar?: string
  }>
  labels: Label[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'todo' | 'in_progress' | 'review' | 'done'
  progress: number
  startDate?: string
  dueDate?: string
  checklist: ChecklistItem[]
  attachments?: Attachment[]
  attachmentCount?: number
  comments: Comment[]
  commentCount?: number
  dependencies?: string[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface ChecklistItem {
  id: string
  text: string
  isCompleted: boolean
  order: number
}

export interface Comment {
  id: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

// File Types
export type FileStatus = 'pending' | 'scanning' | 'ready' | 'infected' | 'failed'

export interface FileItem {
  id: string
  name: string
  size: number
  mimeType: string
  url: string
  thumbnailUrl?: string
  downloadUrl?: string
  uploadedBy?: {
    id: string
    name: string
    avatar?: string
  }
  version?: number
  status: FileStatus
  scanResult?: string
  context?: FileContext
  contextType?: 'chat' | 'mail' | 'project'
  contextId?: string
  createdAt: string
  updatedAt: string
}

export interface PresignedUploadResponse {
  fileId: string
  uploadUrl: string
  fields?: Record<string, string>
  expiresAt: string
}

export interface FileContext {
  type: 'chat' | 'mail' | 'project' | 'task'
  id: string
  name?: string
}

export interface Attachment {
  id: string
  fileId: string
  name: string
  size: number
  mimeType: string
  url: string
}

// Directory Types
export interface OrgUnit {
  id: string
  name: string
  type: 'division' | 'team'
  parentId?: string
  children: OrgUnit[]
  members: User[]
  order: number
}

// Bulk Import Types
export interface BulkImportResult {
  total: number
  imported: number
  skipped: number
  errors: BulkImportError[]
}

export interface BulkImportError {
  row: number
  field?: string
  value?: unknown
  message: string
  type: 'validation' | 'conflict' | 'system'
}

export interface BulkImportPreview {
  valid: number
  invalid: number
  rows: BulkImportRow[]
  columns: string[]
  mapping: Record<string, string>
}

export interface BulkImportRow {
  row: number
  isValid: boolean
  data: Record<string, unknown>
  errors?: BulkImportError[]
}

export interface BulkImportMapping {
  [csvColumn: string]: string // Maps to entity field
}

export interface BulkImportRequest {
  file?: File
  mapping?: BulkImportMapping
  dryRun?: boolean
  skipInvalid?: boolean
}

// Audit Trail Types
export type AuditAction = 
  | 'user_moved'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'unit_created'
  | 'unit_updated'
  | 'unit_deleted'
  | 'unit_merged'

export interface AuditEvent {
  id: string
  action: AuditAction
  actorId: string
  actor: {
    id: string
    name: string
    avatar?: string
  }
  targetId: string
  targetType: 'user' | 'org_unit'
  targetName: string
  details: string // Human-readable description
  changes?: AuditChanges
  metadata?: Record<string, unknown>
  contextType?: 'org_unit' | 'user' | 'global'
  contextId?: string
  timestamp: string
  createdAt: string
}

export interface AuditChanges {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  fields?: string[] // Changed field names
}

export interface AuditFilters {
  startDate?: string
  endDate?: string
  actionType?: AuditAction | AuditAction[]
  actorId?: string
  targetId?: string
  contextType?: 'org_unit' | 'user' | 'global'
  contextId?: string
}

// Legacy alias for backward compatibility
export interface DirectoryAuditEntry extends AuditEvent {}

// Notification Types
export interface Notification {
  id: string
  userId: string
  type: 'chat_message' | 'chat_mention' | 'task_assigned' | 'project_update' | 'system_announcement' | 'mail_received'
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  timestamp: string // Alias for createdAt
  createdAt: string
  metadata?: {
    chatId?: string
    projectId?: string
    senderId?: string
    senderName?: string
    senderAvatar?: string
  }
}

export interface NotificationPreferences {
  userId?: string
  enabled: boolean
  webPushEnabled: boolean
  soundEnabled: boolean
  desktopEnabled: boolean
  doNotDisturb?: {
    enabled: boolean
    startTime: string
    endTime: string
  }
  channels?: {
    channelId: string
    channelType: 'chat' | 'project' | 'mail'
    enabled: boolean
  }[]
}

// Search Types
export type SearchTab = 'all' | 'messages' | 'projects' | 'users' | 'files'

export interface SearchHighlight {
  field: string
  matches: string[]
}

export interface SearchResultItem<T = unknown> {
  item: T
  highlights?: SearchHighlight[]
  score: number
}

export interface SearchResult {
  messages: SearchResultItem<Message>[]
  projects: SearchResultItem<Project>[]
  users: SearchResultItem<User>[]
  files: SearchResultItem<FileItem>[]
  total: number
  took: number // milliseconds
}

export interface SearchFilters {
  dateRange?: {
    from: string
    to: string
  }
  sender?: string
  senderId?: string
  projectId?: string
  chatId?: string
  fileType?: string
  status?: string
  labels?: string[]
  hasAttachments?: boolean
}

export interface SearchParams {
  query: string
  tab?: SearchTab
  filters?: SearchFilters
  limit?: number
  offset?: number
}

// Dashboard Types
export interface DashboardSummary {
  currentProjects: Project[]
  unreadMessages: number
  myTasks: Task[]
  upcomingAgenda: AgendaItem[]
  storageUsage: StorageUsage
}

export interface AgendaItem {
  id: string
  title: string
  type: 'task' | 'meeting'
  startDate: string
  endDate?: string
  projectId?: string
}

export interface StorageUsage {
  used: number
  total: number
  percentage: number
}

// Project Analytics Types
export interface ProjectAnalytics {
  projectId: string
  dateRange: DateRange
  burndown: BurndownData[]
  progress: ProgressData
  workload: WorkloadData[]
  timeline: TimelineData[]
  summary: AnalyticsSummary
}

export interface DateRange {
  start: string
  end: string
}

export interface BurndownData {
  date: string
  ideal: number
  actual: number
  remaining: number
}

export interface ProgressData {
  done: number
  inProgress: number
  todo: number
  total: number
}

export interface WorkloadData {
  userId: string
  userName: string
  done: number
  inProgress: number
  todo: number
  total: number
}

export interface TimelineData {
  date: string
  created: number
  completed: number
  velocity: number
}

export interface AnalyticsSummary {
  totalTasks: number
  completedTasks: number
  completionRate: number
  averageVelocity: number
  estimatedCompletion?: string
  daysRemaining?: number
}

// Domain Event Types
export interface DomainEvent<T = unknown> {
  eventType: string
  ids: string[]
  patch?: Partial<T>
  timestamp: string
  actorId: string
  metadata?: Record<string, unknown>
}

export interface ChatMessageEvent extends DomainEvent<Message> {
  chatId: string
  messageId: string
}

export interface ProjectTaskEvent extends DomainEvent<Task> {
  projectId: string
  taskId: string
  bucketId?: string
}

export interface UserPresenceEvent extends DomainEvent<User> {
  userId: string
  status: PresenceStatus
}

export interface FileEvent extends DomainEvent<FileItem> {
  fileId: string
  status?: 'pending' | 'scanning' | 'ready' | 'infected'
}

// Socket.IO Event Types
export interface SocketEvents {
  // Chat events
  'chat:message_created': (event: ChatMessageEvent) => void
  'chat:message_updated': (event: ChatMessageEvent) => void
  'chat:message_deleted': (event: ChatMessageEvent) => void
  'chat:typing_start': (event: { chatId: string; userId: string; timestamp: string }) => void
  'chat:typing_stop': (event: { chatId: string; userId: string; timestamp: string }) => void
  'chat:reaction_added': (event: ChatMessageEvent) => void
  'chat:reaction_removed': (event: ChatMessageEvent) => void

  // Project events
  'project:task_created': (event: ProjectTaskEvent) => void
  'project:task_updated': (event: ProjectTaskEvent) => void
  'project:task_moved': (event: ProjectTaskEvent) => void
  'project:task_deleted': (event: ProjectTaskEvent) => void

  // User events
  'user:presence_changed': (event: UserPresenceEvent) => void
  'user:updated': (event: DomainEvent<User>) => void

  // File events
  'file:uploaded': (event: FileEvent) => void
  'file:ready': (event: FileEvent) => void
  'file:scan_complete': (event: FileEvent) => void

  // Notification events
  'notification:created': (event: DomainEvent<Notification>) => void

  // Directory/Audit events
  'directory:audit_created': (event: DomainEvent<AuditEvent>) => void
  'directory:user_moved': (event: DomainEvent) => void
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface CursorPaginatedResponse<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
  total?: number
}

export interface CursorPaginationParams {
  cursor?: string
  limit?: number
}
