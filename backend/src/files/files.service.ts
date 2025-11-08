import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan, type FindOptionsWhere } from 'typeorm'
import { FileEntity } from '../entities/file.entity'
import { FileLink } from '../entities/file-link.entity'
import { ConfigService } from '@nestjs/config'
import { S3Client, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectVersionsCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost, PresignedPost } from '@aws-sdk/s3-presigned-post'
import { v4 as uuidv4 } from 'uuid'
import { decodeCursor, encodeCursor } from '../common/pagination/cursor'
import type { Response } from 'express'
import { Readable } from 'node:stream'
import { Queue } from 'bullmq'
import { SEARCH_QUEUE, FILESCAN_QUEUE } from '../queues/queues.module'

@Injectable()
export class FilesService {
  private s3: S3Client
  private bucket: string
  private s3Secondary?: S3Client
  private bucketSecondary?: string

  constructor(
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(FileLink) private readonly links: Repository<FileLink>,
    private readonly config: ConfigService,
    @Inject(SEARCH_QUEUE) private readonly searchQueue: Queue,
    @Inject(FILESCAN_QUEUE) private readonly fileScanQueue: Queue,
  ) {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT') || 'localhost'
    const port = this.config.get<number>('MINIO_PORT') || 9000
    const useSSL = !!this.config.get<boolean>('MINIO_USE_SSL')
    const accessKeyId = this.config.get<string>('MINIO_ACCESS_KEY') || 'minio'
    const secretAccessKey = this.config.get<string>('MINIO_SECRET_KEY') || 'minio123'
    this.bucket = this.config.get<string>('MINIO_BUCKET') || 'epop'
    this.s3 = new S3Client({
      region: 'us-east-1',
      endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    })

    // Optional secondary S3 profile (e.g., Synology S3)
    const secondaryEnabled = String(this.config.get<string>('S3_SECONDARY_ENABLED') || 'false').toLowerCase() === 'true'
    if (secondaryEnabled) {
      const secEndpoint = this.config.get<string>('S3_SECONDARY_ENDPOINT') || ''
      const secPort = Number(this.config.get<number>('S3_SECONDARY_PORT') || 9000)
      const secUseSSL = String(this.config.get<string>('S3_SECONDARY_USE_SSL') || 'false').toLowerCase() === 'true'
      const secAccessKeyId = this.config.get<string>('S3_SECONDARY_ACCESS_KEY') || ''
      const secSecretAccessKey = this.config.get<string>('S3_SECONDARY_SECRET_KEY') || ''
      this.bucketSecondary = this.config.get<string>('S3_SECONDARY_BUCKET') || this.bucket
      if (secEndpoint && secAccessKeyId && secSecretAccessKey) {
        this.s3Secondary = new S3Client({
          region: 'us-east-1',
          endpoint: `${secUseSSL ? 'https' : 'http'}://${secEndpoint}:${secPort}`,
          forcePathStyle: true,
          credentials: { accessKeyId: secAccessKeyId, secretAccessKey: secSecretAccessKey },
        })
      }
    }
  }

  async presign(ownerId: string | null, filename: string) {
    const key = `uploads-temp/${uuidv4()}-${filename}`
    const form: PresignedPost = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, 50 * 1024 * 1024], // 50MB limit
      ],
      Expires: 300,
    })
    const file = await this.files.save(this.files.create({ ownerId: ownerId ?? null, filename, s3Key: key, mime: null, size: null }))
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString()
    // Back-compat: return both url and uploadUrl
    return { url: form.url, uploadUrl: form.url, fields: form.fields, fileId: file.id, key, expiresAt }
  }

  async attach(fileId: string, dto: { refTable: 'messages'|'mail_messages'|'tasks'; refId: string; filename?: string; mime?: string; size?: number }) {
    const file = await this.files.findOne({ where: { id: fileId } })
    if (!file) throw new NotFoundException('File not found')
    // MIME hardening & size limits
    const maxBytes = 50 * 1024 * 1024 // keep consistent with presign
    const size = dto.size ?? (file.size ? Number(file.size) : undefined)
    if (size && size > maxBytes) throw new ForbiddenException('File too large')
    const allowed = new Set<string>([
      'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
      'application/pdf','text/plain','text/markdown',
      'application/json','application/zip','application/x-zip-compressed',
    ])
    if (dto.mime && !allowed.has(dto.mime)) throw new ForbiddenException('Unsupported file type')
    if (dto.filename !== undefined) file.filename = dto.filename
    if (dto.mime !== undefined) file.mime = dto.mime ?? null
    if (dto.size !== undefined) file.size = String(dto.size)
    await this.files.save(file)
    // Finalize: move from uploads-temp/* to uploads/* for permanence
    try {
      if (file.s3Key && file.s3Key.startsWith('uploads-temp/')) {
        const destKey = `uploads/${file.id}-${file.filename}`
        if (destKey !== file.s3Key) {
          const resp = await this.s3.send(new CopyObjectCommand({ Bucket: this.bucket, CopySource: `/${this.bucket}/${file.s3Key}`, Key: destKey }))
          try { await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: file.s3Key })) } catch {}
          file.s3Key = destKey
          try {
            const versionId = (resp as { VersionId?: string } | undefined)?.VersionId
            file.s3VersionId = versionId ?? file.s3VersionId ?? null
          } catch {}
          await this.files.save(file)
        }
      }
    } catch {}
    // Enqueue antivirus scan (if enabled)
    try {
      file.status = 'scanning'
      await this.files.save(file)
      await this.fileScanQueue.add('scan', { fileId: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 })
    } catch {}
    const link = await this.links.save(this.links.create({ file: ({ id: fileId } as unknown as FileEntity), refTable: dto.refTable, refId: dto.refId }))
    try { await this.searchQueue.add('index_doc', { entity: 'files', id: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 }) } catch {}
    return { success: true, linkId: link.id }
  }

  async get(id: string) {
    const file = await this.files.findOne({ where: { id } })
    if (!file) throw new NotFoundException('File not found')
    return file
  }

  async remove(id: string) {
    const file = await this.files.findOne({ where: { id } })
    if (!file) throw new NotFoundException('File not found')
    await this.files.remove(file)
    try { await this.searchQueue.add('delete_doc', { entity: 'files', id: String(id) }, { attempts: 2, backoff: { type: 'fixed', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 }) } catch {}
    return { success: true }
  }

  async listMineCursor(userId: string, limit = 20, cursor: string | null = null) {
    const decoded = decodeCursor(cursor)
    const take = Math.max(1, Math.min(100, Number(limit))) + 1
    const where: FindOptionsWhere<FileEntity> = decoded?.id
      ? ({ ownerId: userId, id: LessThan(decoded.id) } as unknown as FindOptionsWhere<FileEntity>)
      : ({ ownerId: userId } as unknown as FindOptionsWhere<FileEntity>)
    const rows = await this.files.find({ where, order: { id: 'DESC' }, take })
    const items = rows.slice(0, take - 1).reverse()
    const hasMore = rows.length === take
    const nextCursor = hasMore && items.length ? encodeCursor({ id: String(items[0]!.id) }) : undefined
    return { items, nextCursor, hasMore }
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'scanning' | 'ready' | 'infected' | 'failed',
    scanResult: string | null,
  ) {
    const file = await this.files.findOne({ where: { id } })
    if (!file) throw new NotFoundException('File not found')
    file.status = status
    if (status === 'ready' || status === 'infected' || status === 'failed') {
      file.scanResult = scanResult
      file.scannedAt = new Date()
    }
    await this.files.save(file)
    return { success: true }
  }

  async downloadToResponse(id: string, userId: string | null, res: Response) {
    const file = await this.files.findOne({ where: { id } })
    if (!file) throw new NotFoundException('File not found')
    if (file.status === 'infected') throw new ForbiddenException('File blocked by antivirus')
    if (file.status !== 'ready') throw new ForbiddenException('File not ready')
    // ACL: owner or linked context membership (chat participant / project member) or mail sender/recipient
    if (!userId) throw new ForbiddenException('Not permitted')
    if (!file.ownerId || String(file.ownerId) !== String(userId)) {
      const rows: Array<{ ok: number } > = await this.files.query(
        `SELECT 1 AS ok
         FROM files f
         LEFT JOIN file_links l ON l.file_id = f.id
         LEFT JOIN messages m ON (l.ref_table = 'messages' AND l.ref_id = m.id)
         LEFT JOIN chat_participants p ON (p.chat_id = m.chat_id AND p.user_id = $1)
         LEFT JOIN tasks t ON (l.ref_table = 'tasks' AND l.ref_id = t.id)
         LEFT JOIN project_members pm ON (pm.project_id = t.project_id AND pm.user_id = $1)
         LEFT JOIN mail_messages mm ON (l.ref_table = 'mail_messages' AND l.ref_id = mm.id)
         WHERE f.id = $2
           AND (
             p.user_id IS NOT NULL
             OR pm.user_id IS NOT NULL
             OR mm.from_user = $1
             OR $1 = ANY(mm.to_users)
           )
         LIMIT 1`,
        [userId, id],
      )
      const allowed = rows && rows.length > 0
      if (!allowed) throw new ForbiddenException('Not permitted')
    }
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: file.s3Key })
    const obj = await this.s3.send(cmd)
    const body = obj.Body as Readable
    const ct = (obj.ContentType as string | undefined) || file.mime || 'application/octet-stream'
    const cl = (obj.ContentLength as number | undefined) || (file.size ? Number(file.size) : undefined)
    res.setHeader('Content-Type', ct)
    if (cl && isFinite(cl)) res.setHeader('Content-Length', String(cl))
    const filename = encodeURIComponent(file.filename || 'download')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return body.pipe(res)
  }

  async confirm(id: string) {
    const file = await this.files.findOne({ where: { id } })
    if (!file) throw new NotFoundException('File not found')
    try {
      if (file.s3Key && file.s3Key.startsWith('uploads-temp/')) {
        const destKey = `uploads/${file.id}-${file.filename}`
        if (destKey !== file.s3Key) {
          await this.s3.send(new CopyObjectCommand({ Bucket: this.bucket, CopySource: `/${this.bucket}/${file.s3Key}`, Key: destKey }))
          try { await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: file.s3Key })) } catch {}
          file.s3Key = destKey
          await this.files.save(file)
        }
      }
    } catch {}
    // Optional background replication to secondary
    try { await this.replicateToSecondary(file)    } catch {}
    try { await this.searchQueue.add('index_doc', { entity: 'files', id: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 }) } catch {}
    // Trigger antivirus scan after confirm
    try {
      file.status = 'scanning' as any
      await this.files.save(file)
      await this.fileScanQueue.add('scan', { fileId: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 })
    } catch {}
    return file
  }

  async purgeTemp(olderThanHours: number) {
    const cutoff = new Date(Date.now() - Math.max(1, olderThanHours) * 3600 * 1000)
    const rows: Array<{ id: string; s3_key: string }> = await this.files.query(
      `SELECT f.id, f.s3_key
       FROM files f
       LEFT JOIN file_links l ON l.file_id = f.id
       WHERE f.status = $1 AND f.created_at < $2 AND l.file_id IS NULL
       ORDER BY f.id ASC
       LIMIT 500`,
      ['pending', cutoff],
    )
    let deleted = 0
    for (const r of rows) {
      try { await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: r.s3_key })) } catch {}
      try { await this.files.delete({ id: r.id }) ; deleted++ } catch {}
    }
    return { deleted }
  }

  async listVersions(id: string) {
    const file = await this.files.findOne({ where: { id } })
    if (!file) throw new NotFoundException('File not found')
    try {
      const out = await this.s3.send(new ListObjectVersionsCommand({ Bucket: this.bucket, Prefix: file.s3Key }))
      const versions = (out.Versions || [])
        .filter((v) => v.Key === file.s3Key)
        .map((v) => ({ versionId: v.VersionId, size: v.Size, isLatest: v.IsLatest, lastModified: v.LastModified }))
      return { key: file.s3Key, versions }
    } catch {
      return { key: file.s3Key, versions: [] }
    }
  }

  async updateRetention(id: string, policy: string | null) {
    const file = await this.files.findOne({ where: { id } })
    if (!file) throw new NotFoundException('File not found')
    file.retentionPolicy = policy
    file.retentionExpiresAt = computeRetentionExpiry(policy)
    await this.files.save(file)
    return { success: true, retentionPolicy: file.retentionPolicy, retentionExpiresAt: file.retentionExpiresAt }
  }

  async purgeRetentionExpired(batch = 200) {
    const now = new Date()
    const rows: Array<{ id: string; s3_key: string }> = await this.files.query(
      `SELECT id, s3_key FROM files WHERE retention_expires_at IS NOT NULL AND retention_expires_at < $1 ORDER BY id ASC LIMIT $2`,
      [now, Math.max(1, batch)],
    )
    let deleted = 0
    for (const r of rows) {
      try { await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: r.s3_key })) ; deleted++ } catch {}
      try { await this.files.delete({ id: r.id }) } catch {}
    }
    return { deleted }
  }

  private async replicateToSecondary(file: FileEntity) {
    if (!this.s3Secondary || !this.bucketSecondary) return { replicated: false }
    try {
      const obj = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: file.s3Key }))
      const body = obj.Body as Readable
      await this.s3Secondary.send(new PutObjectCommand({ Bucket: this.bucketSecondary, Key: file.s3Key, Body: body, ContentType: file.mime || 'application/octet-stream' }))
      return { replicated: true }
    } catch {
      return { replicated: false }
    }
  }
}

function computeRetentionExpiry(policy: string | null | undefined): Date | null {
  if (!policy) return null
  const now = Date.now()
  const toDate = (ms: number) => new Date(now + ms)
  const day = 24 * 3600 * 1000
  const map: Record<string, number> = {
    '30d': 30 * day,
    '90d': 90 * day,
    '1y': 365 * day,
    '7y': 7 * 365 * day,
    'permanent': 0,
  }
  const dur = map[policy]
  if (dur === undefined) return null
  if (dur === 0) return null
  return toDate(dur)
}
