import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Chat } from '../entities/chat.entity'
import { ChatParticipant } from '../entities/chat-participant.entity'
import { Message } from '../entities/message.entity'
import { MessageReaction } from '../entities/message-reaction.entity'
import { MessageRead } from '../entities/message-read.entity'
import { MessageHistory } from '../entities/message-history.entity'
import { OutboxService } from '../events/outbox.service'
import { decodeCursor, encodeCursor } from '../common/pagination/cursor'
import { REDIS_PUB } from '../redis/redis.module'
import Redis from 'ioredis'
import { sanitizeHtml } from '../common/utils/sanitize-html'

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private readonly chats: Repository<Chat>,
    @InjectRepository(ChatParticipant) private readonly participants: Repository<ChatParticipant>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(MessageReaction) private readonly reactions: Repository<MessageReaction>,
    @InjectRepository(MessageRead) private readonly reads: Repository<MessageRead>,
    @InjectRepository(MessageHistory) private readonly history: Repository<MessageHistory>,
    private readonly outbox: OutboxService,
    @Inject(REDIS_PUB) private readonly redis: Redis,
  ) {}

  async listChats(userId: string) {
    const rows = await this.participants.find({ where: { userId }, relations: { chat: true } })
    return rows.map((r) => r.chat)
  }

  async listThreadMessages(userId: string, chatId: string, rootMessageId: string) {
    const isMember = await this.participants.findOne({ where: { chatId, userId } })
    if (!isMember) throw new ForbiddenException()
    const qb = this.messages
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .select([
        'm.id',
        'm.contentJson',
        'm.delivery',
        'm.createdAt',
        'm.editedAt',
        's.id',
        's.displayName',
        's.presence',
      ])
      .where('m.chat_id = :chatId', { chatId })
      .andWhere('m.root_message_id = :rootId', { rootId: rootMessageId })
      .orderBy('m.id', 'ASC')
    return qb.getMany()
  }

  private async loadAggregates(ids: string[]) {
    const keys = ids.map((id) => `msgagg:${id}`)
    let cached: Array<string | null> = []
    try {
      cached = await this.redis.mget(...keys)
    } catch {
      cached = []
    }
    const result = new Map<string, { reac: Array<{ emoji: string; count: number; userIds: string[] }>; readCount: number }>()
    const missing: string[] = []
    for (let i = 0; i < ids.length; i++) {
      const id = String(ids[i])
      const json = cached[i]
      if (json) {
        try {
          const obj = JSON.parse(json)
          result.set(id, { reac: Array.isArray(obj.reac) ? obj.reac : [], readCount: Number(obj.readCount || 0) })
          continue
        } catch {}
      }
      missing.push(id)
    }
    if (missing.length) {
      const [reacRows, readRows] = await Promise.all([
        this.reactions.query(
          `SELECT message_id, emoji, COUNT(*)::int AS cnt, ARRAY_AGG(user_id) AS user_ids FROM message_reactions WHERE message_id = ANY($1) GROUP BY message_id, emoji`,
          [missing],
        ),
        this.reads.query(
          `SELECT message_id, COUNT(*)::int AS cnt FROM message_reads WHERE message_id = ANY($1) GROUP BY message_id`,
          [missing],
        ),
      ])
      const byMsgReac = new Map<string, Array<{ emoji: string; count: number; userIds: string[] }>>()
      for (const r of reacRows) {
        const arr = byMsgReac.get(String(r.message_id)) || []
        arr.push({ emoji: r.emoji, count: Number(r.cnt), userIds: (r.user_ids || []).map(String) })
        byMsgReac.set(String(r.message_id), arr)
      }
      const byMsgRead = new Map<string, number>()
      for (const rd of readRows) byMsgRead.set(String(rd.message_id), Number(rd.cnt))
      const pipe = this.redis.pipeline()
      for (const id of missing) {
        const val = { reac: byMsgReac.get(String(id)) || [], readCount: byMsgRead.get(String(id)) || 0 }
        result.set(String(id), val)
        try { pipe.set(`msgagg:${id}`, JSON.stringify(val), 'EX', 60) } catch {}
      }
      try { await pipe.exec() } catch {}
    }
    return result
  }

  async createChat(createdBy: string, dto: { isGroup: boolean; title?: string | null; participantIds: string[] }) {
    const chat = await this.chats.save(
      this.chats.create({ isGroup: dto.isGroup, title: dto.title ?? null, createdBy: ({ id: createdBy } as unknown as import('../entities/user.entity').User) })
    )
    const parts = Array.from(new Set([createdBy, ...dto.participantIds]))
    await this.participants.save(parts.map((uid) => this.participants.create({ chatId: chat.id, userId: uid })))
    await this.outbox.append({ name: 'chat.participant.joined', aggregateType: 'chat', aggregateId: chat.id, userId: createdBy, payload: { chatId: chat.id, userId: createdBy } })
    return chat
  }

  async listMessages(
    userId: string,
    chatId: string,
    limit = 20,
    beforeId?: string,
  ): Promise<
    Array<
      Message & {
        reactionsSummary: Array<{ emoji: string; count: number; userIds: string[]; hasCurrentUser: boolean }>
        readCount: number
      }
    >
  > {
    const isMember = await this.participants.findOne({ where: { chatId, userId } })
    if (!isMember) throw new ForbiddenException()
    const qb = this.messages
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .select([
        'm.id',
        'm.contentJson',
        'm.delivery',
        'm.createdAt',
        'm.editedAt',
        's.id',
        's.displayName',
        's.presence',
      ])
      .where('m.chat_id = :chatId', { chatId })
      .orderBy('m.id', 'DESC')
      .limit(Math.max(1, Math.min(100, Number(limit))))
    if (beforeId) qb.andWhere('m.id < :beforeId', { beforeId })
    const rows = await qb.getMany()
    const items = rows.reverse()
    if (!items.length) return [] as Array<
      Message & {
        reactionsSummary: Array<{ emoji: string; count: number; userIds: string[]; hasCurrentUser: boolean }>
        readCount: number
      }
    >
    const ids = items.map((m) => m.id)
    const agg = await this.loadAggregates(ids)
    return items.map((m) => {
      const a = agg.get(String(m.id)) || { reac: [], readCount: 0 }
      const reactionsSummary = (a.reac || []).map((r) => ({
        emoji: r.emoji,
        count: r.count,
        userIds: (r.userIds || []).map(String),
        hasCurrentUser: (r.userIds || []).map(String).includes(String(userId)),
      }))
      return { ...m, reactionsSummary, readCount: a.readCount }
    })
  }

  async listMessagesCursor(userId: string, chatId: string, limit = 20, cursor: string | null = null) {
    const isMember = await this.participants.findOne({ where: { chatId, userId } })
    if (!isMember) throw new ForbiddenException()
    const decoded = decodeCursor(cursor)
    const take = Math.max(1, Math.min(100, Number(limit))) + 1
    const qb = this.messages
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 's')
      .select([
        'm.id',
        'm.contentJson',
        'm.delivery',
        'm.createdAt',
        'm.editedAt',
        's.id',
        's.displayName',
        's.presence',
      ])
      .where('m.chat_id = :chatId', { chatId })
      .orderBy('m.id', 'DESC')
      .limit(take)
    if (decoded?.id) qb.andWhere('m.id < :beforeId', { beforeId: decoded.id })
    const rows = await qb.getMany()
    const base = rows.slice(0, take - 1).reverse()
    let items = base
    if (base.length) {
      const ids = base.map((m) => m.id)
      const agg = await this.loadAggregates(ids)
      items = base.map((m) => {
        const a = agg.get(String(m.id)) || { reac: [], readCount: 0 }
        const reactionsSummary = (a.reac || []).map((r) => ({
          emoji: r.emoji,
          count: r.count,
          userIds: (r.userIds || []).map(String),
          hasCurrentUser: (r.userIds || []).map(String).includes(String(userId)),
        }))
        return { ...m, reactionsSummary, readCount: a.readCount }
      })
    }
    const hasMore = rows.length === take
    const nextCursor = hasMore && items.length ? encodeCursor({ id: String(items[0]!.id) }) : undefined
    return { items, nextCursor, hasMore }
  }

  async sendMessage(userId: string, dto: { chatId: string; content: unknown; delivery?: 'normal' | 'important' | 'urgent'; rootMessageId?: string | null }) {
    const isMember = await this.participants.findOne({ where: { chatId: dto.chatId, userId } })
    if (!isMember) throw new ForbiddenException()
    // Server-side sanitize if rich HTML present
    let contentSan = dto.content
    try {
      if (contentSan && typeof contentSan === 'object' && typeof (contentSan as { html?: unknown }).html === 'string') {
        contentSan = { ...(contentSan as object), html: sanitizeHtml(String((contentSan as { html: string }).html)) }
      } else if (typeof contentSan === 'string') {
        contentSan = sanitizeHtml(contentSan)
      }
    } catch {}
    const msg = await this.messages.save(
      this.messages.create({
        chat: ({ id: dto.chatId } as unknown as Chat),
        sender: ({ id: userId } as unknown as import('../entities/user.entity').User),
        contentJson: contentSan,
        delivery: dto.delivery ?? 'normal',
        rootMessage: dto.rootMessageId ? (({ id: dto.rootMessageId } as unknown) as Message) : null,
      })
    )
    await this.outbox.append({ name: 'chat.message.created', aggregateType: 'message', aggregateId: msg.id, userId, payload: { chatId: dto.chatId, messageId: msg.id, delivery: msg.delivery } })
    if (msg.delivery === 'urgent') {
      await this.outbox.append({ name: 'user.presence.updated', aggregateType: 'user', aggregateId: userId, userId, payload: { notify: 'urgent', chatId: dto.chatId, messageId: msg.id } })
    }
    try { await this.redis.del(`msgagg:${msg.id}`) } catch {}
    return msg
  }

  async addReaction(userId: string, dto: { messageId: string; emoji: string }) {
    const message = await this.messages.findOne({ where: { id: dto.messageId }, relations: { chat: true } })
    if (!message) throw new NotFoundException('Message not found')
    const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } })
    if (!isMember) throw new ForbiddenException()
    await this.reactions.save(this.reactions.create({ messageId: dto.messageId, userId, emoji: dto.emoji }))
    await this.outbox.append({ name: 'chat.message.reaction.added', aggregateType: 'message', aggregateId: dto.messageId, userId, payload: { chatId: message.chat.id, emoji: dto.emoji } })
    try { await this.redis.del(`msgagg:${dto.messageId}`) } catch {}
    return { success: true }
  }

  async editMessage(userId: string, messageId: string, patch: { content: unknown }) {
    const message = await this.messages.findOne({ where: { id: messageId }, relations: { chat: true, sender: true } })
    if (!message) throw new NotFoundException('Message not found')
    const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } })
    if (!isMember) throw new ForbiddenException()
    if (!message.sender || String(message.sender.id) !== String(userId)) throw new ForbiddenException('Only sender can edit')
    // Save history before change
    await this.history.save(this.history.create({ message: ({ id: messageId } as unknown as Message), actor: ({ id: userId } as unknown as import('../entities/user.entity').User), action: 'edited', prevContentJson: message.contentJson }))
    let contentSan = patch.content
    try {
      if (contentSan && typeof contentSan === 'object' && typeof (contentSan as { html?: unknown }).html === 'string') {
        contentSan = { ...(contentSan as object), html: sanitizeHtml(String((contentSan as { html: string }).html)) }
      } else if (typeof contentSan === 'string') {
        contentSan = sanitizeHtml(contentSan)
      }
    } catch {}
    message.contentJson = contentSan
    message.editedAt = new Date()
    await this.messages.save(message)
    await this.outbox.append({ name: 'chat.message.updated', aggregateType: 'message', aggregateId: messageId, userId, payload: { chatId: message.chat.id, messageId, patch: { contentJson: patch.content, editedAt: message.editedAt } } })
    return { success: true }
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.messages.findOne({ where: { id: messageId }, relations: { chat: true, sender: true } })
    if (!message) throw new NotFoundException('Message not found')
    const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } })
    if (!isMember) throw new ForbiddenException()
    if (!message.sender || String(message.sender.id) !== String(userId)) throw new ForbiddenException('Only sender can delete')
    await this.history.save(this.history.create({ message: ({ id: messageId } as unknown as Message), actor: ({ id: userId } as unknown as import('../entities/user.entity').User), action: 'deleted', prevContentJson: message.contentJson }))
    await this.messages.softDelete({ id: messageId })
    await this.outbox.append({ name: 'chat.message.deleted', aggregateType: 'message', aggregateId: messageId, userId, payload: { chatId: message.chat.id, messageId } })
    try { await this.redis.del(`msgagg:${messageId}`) } catch {}
    return { success: true }
  }

  async removeReaction(userId: string, dto: { messageId: string; emoji: string }) {
    const message = await this.messages.findOne({ where: { id: dto.messageId }, relations: { chat: true } })
    if (!message) throw new NotFoundException('Message not found')
    const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } })
    if (!isMember) throw new ForbiddenException()
    await this.reactions.delete({ messageId: dto.messageId, userId, emoji: dto.emoji })
    await this.outbox.append({ name: 'chat.message.reaction.removed', aggregateType: 'message', aggregateId: dto.messageId, userId, payload: { chatId: message.chat.id, emoji: dto.emoji } })
    try { await this.redis.del(`msgagg:${dto.messageId}`) } catch {}
    return { success: true }
  }

  async markRead(userId: string, messageId: string) {
    const message = await this.messages.findOne({ where: { id: messageId }, relations: { chat: true } })
    if (!message) throw new NotFoundException('Message not found')
    const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } })
    if (!isMember) throw new ForbiddenException()
    await this.reads.save(this.reads.create({ messageId, userId, readAt: new Date() }))
    await this.outbox.append({ name: 'chat.message.read', aggregateType: 'message', aggregateId: messageId, userId, payload: { chatId: message.chat.id } })
    try { await this.redis.del(`msgagg:${messageId}`) } catch {}
    return { success: true }
  }

  async unreadPerChat(userId: string) {
    const rows = await this.messages.query(`
      SELECT m.chat_id, COUNT(*) AS unread
      FROM messages m
      LEFT JOIN message_reads r 
        ON r.message_id = m.id AND r.user_id = $1
      JOIN chat_participants p
        ON p.chat_id = m.chat_id AND p.user_id = $1
      WHERE r.message_id IS NULL AND m.sender_id <> $1
      GROUP BY m.chat_id;`, [userId])
    return rows
  }
}
