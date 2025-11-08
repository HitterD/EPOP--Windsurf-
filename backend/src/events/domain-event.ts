export type DomainEventName =
  | 'chat.message.created'
  | 'chat.message.updated'
  | 'chat.message.deleted'
  | 'chat.message.read'
  | 'chat.message.reaction.added'
  | 'chat.message.reaction.removed'
  | 'chat.thread.created'
  | 'chat.participant.joined'
  | 'chat.participant.left'
  | 'project.task.created'
  | 'project.task.updated'
  | 'project.task.moved'
  | 'project.task.rescheduled'
  | 'project.task.commented'
  | 'project.dependency.added'
  | 'project.dependency.removed'
  | 'files.file.uploaded'
  | 'files.file.linked'
  | 'mail.message.created'
  | 'mail.message.moved'
  | 'user.presence.updated'
  | 'directory.unit.moved'
  | 'directory.user.moved'
  | 'user.password.reset.requested'
  | 'user.password.reset.completed'

export interface DomainEvent<T = any> {
  id: string
  name: DomainEventName
  aggregateType: 'message' | 'chat' | 'task' | 'file' | 'mail' | 'user' | 'project' | 'org'
  aggregateId: string
  userId?: string
  timestamp: string
  version: 1
  payload: T
}
