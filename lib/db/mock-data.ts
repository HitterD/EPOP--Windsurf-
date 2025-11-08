import {
  User,
  Chat,
  Message,
  Project,
  Task,
  FileItem,
  OrgUnit,
  Notification,
  Bucket,
  MailMessage,
  FileStatus, // Import FileStatus type
} from '@/types'

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@epop.com',
    name: 'Admin User',
    title: 'System Administrator',
    department: 'IT',
    extension: '1001',
    role: 'admin', 
    permissions: [], 
    presence: 'available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-2',
    email: 'john.doe@epop.com',
    name: 'John Doe',
    title: 'Senior Developer',
    department: 'Engineering',
    extension: '1002',
    role: 'member', 
    permissions: [], 
    presence: 'busy',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-3',
    email: 'jane.smith@epop.com',
    name: 'Jane Smith',
    title: 'Product Manager',
    department: 'Product',
    extension: '1003',
    role: 'member', 
    permissions: [], 
    presence: 'available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Mock Chats
export const mockChats: Chat[] = [
  {
    id: 'chat-1',
    type: 'direct',
    name: 'John Doe',
    members: ['user-1', 'user-2'],
    unreadCount: 3,
    isPinned: true,
    isMuted: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'chat-2',
    type: 'group',
    name: 'Team Marketing',
    members: ['user-1', 'user-2', 'user-3'],
    unreadCount: 1,
    isPinned: false,
    isMuted: false,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
]

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    chatId: 'chat-1',
    senderId: 'user-2',
    content: 'Can you review the latest designs?',
    type: 'text',
    reactions: [],
    isEdited: false,
    isDeleted: false,
    readBy: ['user-2'],
    deliveryPriority: 'normal',
    timestamp: new Date().toISOString(), 
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
]

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Website Redesign',
    description: 'Complete redesign of the company website',
    color: '#3B82F6',
    ownerId: 'user-1',
    memberIds: ['user-1', 'user-2', 'user-3'],
    buckets: [
      {
        id: 'bucket-1',
        projectId: 'proj-1',
        name: 'To Do',
        order: 0,
        tasks: [],
      },
      {
        id: 'bucket-2',
        projectId: 'proj-1',
        name: 'In Progress',
        order: 1,
        tasks: [],
      },
      {
        id: 'bucket-3',
        projectId: 'proj-1',
        name: 'Done',
        order: 2,
        tasks: [],
      },
    ],
    createdAt: new Date(Date.now() - 2592000000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Mock Tasks
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    bucketId: 'bucket-1',
    title: 'Review pull requests',
    description: 'Review and merge pending PRs',
    assigneeIds: ['user-1'],
    labels: [{ id: 'label-1', name: 'Development', color: '#3B82F6' }],
    priority: 'high',
    status: 'todo',
    progress: 0,
    dueDate: new Date().toISOString(),
    checklist: [],
    comments: [],
    order: 0,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Mock Files
export const mockFiles: FileItem[] = [
  {
    id: 'file-1',
    name: 'design-mockup.png',
    size: 1024000,
    mimeType: 'image/png',
    url: '/uploads/design-mockup.png',
    uploadedBy: { id: 'user-2', name: 'Jane Smith' }, 
    context: {
      type: 'project',
      id: 'proj-1',
      name: 'Website Redesign',
    },
    status: 'ready',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'file-2',
    name: 'style-guide.pdf',
    size: 512000,
    mimeType: 'application/pdf',
    url: '/uploads/style-guide.pdf',
    uploadedBy: { id: 'user-1', name: 'Admin User' }, 
    context: {
      type: 'project',
      id: 'proj-1',
      name: 'Website Redesign',
    },
    status: 'ready',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

// In-memory storage
export class MockDatabase {
  private users: Map<string, User> = new Map()
  private chats: Map<string, Chat> = new Map()
  private messages: Map<string, Message[]> = new Map()
  private projects: Map<string, Project> = new Map()
  private tasks: Map<string, Task> = new Map()
  private files: Map<string, FileItem> = new Map()
  private orgTree: OrgUnit | null = null
  private notificationsByUser: Map<string, Notification[]> = new Map()
  private threadMessages: Map<string, Message[]> = new Map() 
  private mailById: Map<string, MailMessage> = new Map()

  constructor() {
    this.seed()
  }

  // Mail methods
  listMailByFolder(folder: 'received' | 'sent' | 'deleted'): MailMessage[] {
    return Array.from(this.mailById.values()).filter((m) => m.folder === folder)
  }

  getMail(messageId: string): MailMessage | undefined {
    return this.mailById.get(messageId)
  }

  createMail(mail: MailMessage): MailMessage {
    this.mailById.set(mail.id, mail)
    return mail
  }

  moveMail(messageId: string, folder: 'received' | 'sent' | 'deleted'): MailMessage | undefined {
    const mail = this.mailById.get(messageId)
    if (!mail) return undefined
    const updated = { ...mail, folder, updatedAt: new Date().toISOString() }
    this.mailById.set(messageId, updated)
    return updated
  }

  setMailRead(messageId: string, isRead: boolean): MailMessage | undefined {
    const mail = this.mailById.get(messageId)
    if (!mail) return undefined
    const updated = { ...mail, isRead, updatedAt: new Date().toISOString() }
    this.mailById.set(messageId, updated)
    return updated
  }

  private seed() {
    mockUsers.forEach((user) => this.users.set(user.id, user))
    mockChats.forEach((chat) => this.chats.set(chat.id, chat))
    mockProjects.forEach((project) => this.projects.set(project.id, project))
    mockTasks.forEach((task) => this.tasks.set(task.id, task))
    mockFiles.forEach((file) => this.files.set(file.id, file))
    
    // Group messages by chatId
    mockMessages.forEach((message) => {
      const chatMessages = this.messages.get(message.chatId) || []
      chatMessages.push(message)
      this.messages.set(message.chatId, chatMessages)
    })

    // Build org tree from users' departments
    const root: OrgUnit = {
      id: 'ou-root',
      name: 'Company',
      type: 'division',
      children: [],
      members: [],
      order: 0,
    }
    const departments = ['IT', 'Engineering', 'Product']
    departments.forEach((dept, idx) => {
      const unit: OrgUnit = {
        id: `ou-${dept.toLowerCase()}`,
        name: dept,
        type: 'team',
        parentId: root.id,
        children: [],
        members: Array.from(this.users.values()).filter((u) => u.department === dept),
        order: idx,
      }
      root.children.push(unit)
    })
    this.orgTree = root

    // Seed simple mail
    const mailSamples: MailMessage[] = [
      {
        id: 'mail-1',
        from: 'john.doe@epop.com',
        to: ['admin@epop.com'],
        subject: 'Welcome to EPOP',
        body: '<p>Hello, welcome!</p>',
        folder: 'received',
        isRead: false,
        isStarred: false,
        priority: 'normal',
        date: new Date().toISOString(), 
        createdAt: new Date(Date.now() - 3600_000).toISOString(),
        updatedAt: new Date(Date.now() - 3600_000).toISOString(),
      },
    ]
    mailSamples.forEach((m) => this.mailById.set(m.id, m))
  }

  // User methods
  getUser(id: string): User | undefined {
    return this.users.get(id)
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((user) => user.email === email)
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values())
  }

  createUser(user: User): User {
    this.users.set(user.id, user)
    return user
  }

  getAllProjects(): Project[] {
    return Array.from(this.projects.values())
  }

  getAllChats(): Chat[] {
    return Array.from(this.chats.values())
  }

  // Org Directory methods
  getOrgTree(): OrgUnit {
    return this.orgTree as OrgUnit
  }

  private findUnitById(unit: OrgUnit, id: string): OrgUnit | null {
    if (unit.id === id) return unit
    for (const child of unit.children) {
      const found = this.findUnitById(child, id)
      if (found) return found
    }
    return null
  }

  private removeUserFromAllUnits(unit: OrgUnit, userId: string) {
    unit.members = unit.members.filter((m) => m.id !== userId)
    unit.children.forEach((c) => this.removeUserFromAllUnits(c, userId))
  }

  updateOrgUnit(unitId: string, updates: Partial<OrgUnit>): OrgUnit | undefined {
    if (!this.orgTree) return undefined
    const target = this.findUnitById(this.orgTree, unitId)
    if (!target) return undefined
    Object.assign(target, updates)
    return target
  }

  moveUserToUnit(userId: string, newUnitId: string): boolean {
    if (!this.orgTree) return false
    const user = this.users.get(userId)
    if (!user) return false
    const target = this.findUnitById(this.orgTree, newUnitId)
    if (!target) return false
    // remove from all, then add
    this.removeUserFromAllUnits(this.orgTree, userId)
    target.members.push(user)
    return true
  }

  // Chat methods
  getChat(id: string): Chat | undefined {
    return this.chats.get(id)
  }

  getUserChats(userId: string): Chat[] {
    return Array.from(this.chats.values()).filter((chat) => chat.members.includes(userId))
  }

  createChat(chat: Chat): Chat {
    this.chats.set(chat.id, chat)
    return chat
  }

  // Message methods
  getChatMessages(chatId: string): Message[] {
    return this.messages.get(chatId) || []
  }

  addMessage(message: Message): Message {
    const chatMessages = this.messages.get(message.chatId) || []
    chatMessages.push(message)
    this.messages.set(message.chatId, chatMessages)
    return message
  }

  updateMessage(chatId: string, messageId: string, patch: Partial<Message>): Message | undefined {
    const msgs = this.messages.get(chatId)
    if (!msgs) return undefined
    const idx = msgs.findIndex((m) => m.id === messageId)
    if (idx === -1) return undefined
    const base = msgs[idx]!
    const updated: Message = {
      ...base,
      ...patch,
      id: base.id,
      chatId: base.chatId,
      senderId: base.senderId,
      content: base.content,
      type: base.type,
      isEdited: base.isEdited,
      isDeleted: base.isDeleted,
      readBy: base.readBy,
      deliveryPriority: base.deliveryPriority,
      timestamp: base.timestamp,
      createdAt: base.createdAt,
      updatedAt: new Date().toISOString(),
    }
    msgs[idx] = updated
    this.messages.set(chatId, [...msgs])
    return updated
  }

  addReaction(chatId: string, messageId: string, emoji: string, userId: string) {
    const msgs = this.messages.get(chatId)
    if (!msgs) return
    const msg = msgs.find((m) => m.id === messageId)
    if (!msg) return
    const reactions = msg.reactions || []
    reactions.push({ emoji, userId, createdAt: new Date().toISOString() })
    this.updateMessage(chatId, messageId, { reactions })
  }

  // Threads
  getThread(parentMessageId: string): Message[] {
    return this.threadMessages.get(parentMessageId) || []
  }

  addThreadMessage(parentMessageId: string, message: Message): Message {
    const arr = this.threadMessages.get(parentMessageId) || []
    arr.push(message)
    this.threadMessages.set(parentMessageId, arr)
    return message
  }

  // Project methods
  getProject(id: string): Project | undefined {
    return this.projects.get(id)
  }

  getUserProjects(userId: string): Project[] {
    return Array.from(this.projects.values()).filter(
      (project) => project.ownerId === userId || project.memberIds.includes(userId)
    )
  }

  createProject(project: Project): Project {
    this.projects.set(project.id, project)
    return project
  }

  deleteProject(projectId: string): boolean {
    return this.projects.delete(projectId)
  }

  updateProject(project: Project): Project {
    this.projects.set(project.id, project)
    return project
  }

  // Bucket helpers
  getBuckets(projectId: string): Bucket[] {
    const p = this.projects.get(projectId)
    return p ? p.buckets : []
  }

  addBucket(projectId: string, name: string): Bucket | undefined {
    const p = this.projects.get(projectId)
    if (!p) return undefined
    const newBucket: Bucket = {
      id: `bucket-${Date.now()}`,
      projectId,
      name,
      order: p.buckets.length,
      tasks: [],
    }
    p.buckets.push(newBucket)
    p.updatedAt = new Date().toISOString()
    this.projects.set(projectId, p)
    return newBucket
  }

  // Task methods
  getTask(id: string): Task | undefined {
    return this.tasks.get(id)
  }

  getProjectTasks(projectId: string): Task[] {
    return Array.from(this.tasks.values()).filter((task) => task.projectId === projectId)
  }

  createTask(task: Task): Task {
    this.tasks.set(task.id, task)
    return task
  }

  updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id)
    if (task) {
      const updated = { ...task, ...updates, updatedAt: new Date().toISOString() }
      this.tasks.set(id, updated)
      return updated
    }
    return undefined
  }

  deleteTask(taskId: string): boolean {
    return this.tasks.delete(taskId)
  }

  // File methods
  getFile(id: string): FileItem | undefined {
    return this.files.get(id)
  }

  getAllFiles(): FileItem[] {
    return Array.from(this.files.values())
  }

  createFile(file: FileItem): FileItem {
    this.files.set(file.id, file)
    return file
  }

  deleteFile(fileId: string): boolean {
    return this.files.delete(fileId)
  }

  // Notifications
  getNotifications(userId: string): Notification[] {
    return this.notificationsByUser.get(userId) || []
  }

  addNotification(notification: Notification): Notification {
    const list = this.notificationsByUser.get(notification.userId) || []
    list.unshift(notification)
    this.notificationsByUser.set(notification.userId, list)
    return notification
  }

  markNotificationRead(userId: string, notificationId: string): boolean {
    const list = this.notificationsByUser.get(userId)
    if (!list) return false
    const idx = list.findIndex((n) => n.id === notificationId)
    if (idx === -1) return false
    const current = list[idx]!
    const updated: Notification = {
      ...current,
      id: current.id,
      userId: current.userId,
      isRead: true,
    }
    list[idx] = updated
    this.notificationsByUser.set(userId, list)
    return true
  }
}

export const db = new MockDatabase()
