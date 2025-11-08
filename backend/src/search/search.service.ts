import { Inject, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Message } from '../entities/message.entity'
import { MailMessage } from '../entities/mail-message.entity'
import { FileEntity } from '../entities/file.entity'
import { Task } from '../entities/task.entity'
import axios, { AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { Counter, Histogram, register } from 'prom-client'
import { ConfigService } from '@nestjs/config'
import { Agent as HttpAgent } from 'node:http'
import { Agent as HttpsAgent } from 'node:https'
import { decodeCursor, encodeCursor } from '../common/pagination/cursor'
import { Queue } from 'bullmq'
import { SEARCH_QUEUE } from '../queues/queues.module'

type SearchHit = {
  _id?: string | number
  id?: string | number
  _source?: { id?: string | number }
  [k: string]: unknown
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)
  private client: AxiosInstance
  private prefix: string
  private searchRequests: Counter
  private searchDuration: Histogram
  private indexLag: Histogram

  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(MailMessage) private readonly mails: Repository<MailMessage>,
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly config: ConfigService,
    @Inject(SEARCH_QUEUE) private readonly queue: Queue,
  ) {
    const baseURL = this.config.get<string>('ZINC_URL') || 'http://localhost:4080'
    const user = this.config.get<string>('ZINC_USER') || 'admin'
    const pass = this.config.get<string>('ZINC_PASS') || 'admin'
    this.prefix = this.config.get<string>('ZINC_INDEX_PREFIX') || 'epop'
    const httpAgent = new HttpAgent({ keepAlive: true, keepAliveMsecs: 20000, maxSockets: 128 })
    const httpsAgent = new HttpsAgent({ keepAlive: true, keepAliveMsecs: 20000, maxSockets: 128 })
    this.client = axios.create({
      baseURL,
      auth: { username: user, password: pass },
      timeout: 180000,
      httpAgent,
      httpsAgent,
      transitional: { clarifyTimeoutError: true },
    })

    // Metrics
    this.searchRequests = new Counter<'method'>({ name: 'search_requests_total', help: 'Total search requests', labelNames: ['method'] as const, registers: [register] })
    this.searchDuration = new Histogram<'method'>({ name: 'search_duration_seconds', help: 'Search duration seconds', buckets: [0.01,0.05,0.1,0.2,0.5,1,2,5], labelNames: ['method'] as const, registers: [register] })
    this.indexLag = new Histogram({ name: 'search_index_lag_seconds', help: 'Time from entity creation to index write', buckets: [0.1,0.5,1,2,5,10,30,60,120,300], registers: [register] })

    // Simple retry with exponential backoff for transient network errors
    this.client.interceptors.response.use(undefined, async (error: AxiosError) => {
      const cfg = (error.config as (InternalAxiosRequestConfig & { __retries?: number })) || ({} as InternalAxiosRequestConfig & { __retries?: number })
      cfg.__retries = (cfg.__retries ?? 0) + 1
      const msg = typeof error.message === 'string' ? error.message : ''
      const code = error.code
      const retriable = (
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ESOCKETTIMEDOUT' ||
        code === 'EAI_AGAIN' ||
        msg.toLowerCase().includes('timeout')
      )
      if (cfg.__retries <= 5 && retriable) {
        const base = 300
        const delay = Math.max(100, base * Math.pow(2, cfg.__retries))
        await new Promise((r) => setTimeout(r, delay))
        return this.client.request(cfg)
      }
      return Promise.reject(error)
    })
  }

  async enqueueBackfill(entity: 'messages'|'mail_messages'|'files'|'tasks') {
    try {
      await this.queue.add('backfill', { entity }, { attempts: 3, backoff: { type: 'fixed', delay: 5000 }, removeOnComplete: 10, removeOnFail: 100 })
      return { enqueued: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.warn(`enqueue backfill failed: ${msg}`)
      return { enqueued: false }
    }
  }

  async searchCursor(entity: 'messages'|'mail_messages'|'files'|'tasks', q: string, userId: string | undefined, limit = 20, cursor: string | null = null) {
    const endTimer = this.searchDuration.startTimer({ method: 'cursor' })
    this.searchRequests.inc({ method: 'cursor' })
    const index = this.idx(entity)
    const decoded = decodeCursor(cursor)
    const off = Math.max(0, Number(decoded?.off ?? 0))
    const size = Math.max(1, Math.min(100, Number(limit))) + 1
    try {
      const { data } = await this.client.post(`/api/${index}/_search`, { query: q, search_type: 'match', from: off, max_results: size })
      let hits: SearchHit[] = Array.isArray(data?.hits) ? (data.hits as SearchHit[]) : []
      if (userId) {
        const allowed = await this.filterAccessible(index, hits, userId)
        hits = hits.filter((h) => allowed.has(this.extractId(h)))
      }
      const items = hits.slice(0, size - 1)
      const hasMore = hits.length === size
      const nextCursor = hasMore ? encodeCursor({ off: off + (size - 1) }) : undefined
      const res = { items, nextCursor, hasMore }
      endTimer()
      return res
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.warn(`search cursor failed for ${index}: ${msg}`)
      endTimer()
      return { items: [], hasMore: false }
    }
  }

  private idx(name: string) { return `${this.prefix}_${name}` }

  async searchAll(q: string, userId?: string) {
    const endTimer = this.searchDuration.startTimer({ method: 'all' })
    this.searchRequests.inc({ method: 'all' })
    const indices = [this.idx('messages'), this.idx('mail_messages'), this.idx('files'), this.idx('tasks')]
    const results: Array<{ index: string; hits: SearchHit[] }> = []
    for (const index of indices) {
      try {
        const { data } = await this.client.post(`/api/${index}/_search`, { query: q, search_type: 'match', from: 0, max_results: 50 })
        let hits: SearchHit[] = Array.isArray(data?.hits) ? (data.hits as SearchHit[]) : []
        if (userId) {
          const allowed = await this.filterAccessible(index, hits, userId)
          hits = hits.filter((h) => allowed.has(this.extractId(h)))
        }
        results.push({ index, hits })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        this.logger.warn(`search failed for ${index}: ${msg}`)
      }
    }
    const res = { results }
    endTimer()
    return res
  }

  private extractId(hit: SearchHit): string {
    if (!hit) return ''
    return String((hit._id ?? hit.id ?? hit._source?.id ?? '').toString())
  }

  private async filterAccessible(index: string, hits: SearchHit[], userId: string): Promise<Set<string>> {
    const ids = hits.map((h) => this.extractId(h)).filter(Boolean)
    const set = new Set<string>()
    if (!ids.length) return set
    try {
      if (index.endsWith('_mail_messages')) {
        const rows = await this.mails.query(
          `SELECT id FROM mail_messages WHERE id = ANY($2::bigint[]) AND (from_user = $1 OR $1 = ANY(to_users))`,
          [userId, ids],
        )
        rows.forEach((r: { id: string | number }) => set.add(String(r.id)))
      } else if (index.endsWith('_messages')) {
        // chat messages
        const rows = await this.messages.query(
          `SELECT m.id FROM messages m 
           JOIN chat_participants p ON p.chat_id = m.chat_id AND p.user_id = $1
           WHERE m.id = ANY($2::bigint[])`,
          [userId, ids],
        )
        rows.forEach((r: { id: string | number }) => set.add(String(r.id)))
      } else if (index.endsWith('_tasks')) {
        const rows = await this.tasks.query(
          `SELECT t.id FROM tasks t
           JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
           WHERE t.id = ANY($2::bigint[])`,
          [userId, ids],
        )
        rows.forEach((r: { id: string | number }) => set.add(String(r.id)))
      } else if (index.endsWith('_files')) {
        const rows = await this.files.query(
          `SELECT DISTINCT f.id
           FROM files f
           LEFT JOIN file_links l ON l.file_id = f.id
           LEFT JOIN messages m ON (l.ref_table = 'messages' AND l.ref_id = m.id)
           LEFT JOIN chat_participants p ON (p.chat_id = m.chat_id AND p.user_id = $1)
           WHERE f.id = ANY($2::bigint[]) AND (f.owner_id = $1 OR p.user_id IS NOT NULL)`,
          [userId, ids],
        )
        rows.forEach((r: { id: string | number }) => set.add(String(r.id)))
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.warn(`permission filter failed for ${index}: ${msg}`)
    }
    return set
  }

  async backfill(entity: 'messages'|'mail_messages'|'files'|'tasks') {
    if (entity === 'messages') {
      const rows = await this.messages.find({ relations: { sender: true, chat: true } })
      for (const m of rows) {
        await this.indexDoc(this.idx('messages'), m.id, {
          chatId: m.chat?.id,
          senderId: m.sender?.id ?? null,
          delivery: m.delivery,
          createdAt: m.createdAt,
          text: JSON.stringify(m.contentJson),
        })
      }
    } else if (entity === 'mail_messages') {
      const rows = await this.mails.find()
      for (const m of rows) {
        await this.indexDoc(this.idx('mail_messages'), m.id, {
          fromUser: m.fromUser,
          toUsers: m.toUsers,
          subject: m.subject,
          bodyHtml: m.bodyHtml,
          folder: m.folder,
          createdAt: m.createdAt,
        })
      }
    } else if (entity === 'files') {
      const rows = await this.files.find()
      for (const f of rows) {
        await this.indexDoc(this.idx('files'), f.id, {
          ownerId: f.ownerId,
          filename: f.filename,
          mime: f.mime,
          size: f.size,
          createdAt: f.createdAt,
        })
      }
    } else if (entity === 'tasks') {
      const rows = await this.tasks.find({ relations: { project: true } })
      for (const t of rows) {
        await this.indexDoc(this.idx('tasks'), t.id, {
          projectId: t.project?.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          progress: t.progress,
          dueAt: t.dueAt,
          createdAt: t.createdAt,
        })
      }
    }
    return { success: true }
  }

  async indexDoc(index: string, id: string, body: Record<string, unknown>) {
    try {
      await this.client.post(`/api/${index}/_doc/${id}`, body)
      // record index lag if available
      try {
        const createdAt = (body as { createdAt?: Date | string | number | null })?.createdAt
        if (createdAt != null) {
          const ts = new Date(createdAt as string | number | Date).getTime()
          if (isFinite(ts)) {
            const lagSec = Math.max(0, (Date.now() - ts) / 1000)
            this.indexLag.observe(lagSec)
          }
        }
      } catch {}
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.warn(`index ${index}/${id} failed: ${msg}`)
      return false
    }
  }

  async deleteDoc(index: string, id: string) {
    try {
      await this.client.delete(`/api/${index}/_doc/${id}`)
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.logger.warn(`delete ${index}/${id} failed: ${msg}`)
      return false
    }
  }
}
