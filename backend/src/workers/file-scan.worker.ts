import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Worker, Queue } from 'bullmq'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FileEntity } from '../entities/file.entity'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import net from 'net'
import { Inject } from '@nestjs/common'
import { FILESCAN_QUEUE } from '../queues/queues.module'

@Injectable()
export class FileScanWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileScanWorker.name)
  private worker?: Worker
  private s3: S3Client
  private bucket: string
  private enabled: boolean
  private host: string
  private port: number

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @Inject(FILESCAN_QUEUE) private readonly queue: Queue,
  ) {
    this.enabled = String(this.config.get<string>('CLAMAV_ENABLED') || 'false').toLowerCase() === 'true'
    this.host = this.config.get<string>('CLAMAV_HOST') || 'clamav'
    this.port = Number(this.config.get<string>('CLAMAV_PORT') || 3310)

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
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('ClamAV scanning disabled (CLAMAV_ENABLED=false)')
      return
    }

    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
    this.worker = new Worker(
      'filescan',
      async (job) => {
        const fileId: string = String(job.data?.fileId || '')
        if (!fileId) return { skipped: true }

        const file = await this.files.findOne({ where: { id: fileId } })
        if (!file || !file.s3Key) return { skipped: true }

        try {
          const obj = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: file.s3Key }))
          const body = obj.Body as Readable
          const result = await this.scanStream(body)
          if (result.infected) {
            file.status = 'infected'
            file.scanResult = result.signature || 'infected'
          } else {
            file.status = 'ready'
            file.scanResult = 'OK'
          }
          file.scannedAt = new Date() as any
          await this.files.save(file)
          return { scanned: true, infected: result.infected, signature: result.signature }
        } catch (e: any) {
          this.logger.warn(`Scan failed for ${fileId}: ${String(e?.message || e)}`)
          file.status = 'failed'
          file.scanResult = String(e?.message || e)
          file.scannedAt = new Date() as any
          await this.files.save(file)
          return { scanned: false, error: String(e?.message || e) }
        }
      },
      { connection: { url } }
    )

    this.worker.on('completed', (job) => this.logger.log(`filescan job ${job.id} done (fileId=${job.data?.fileId})`))
    this.worker.on('failed', (job, err) => this.logger.warn(`filescan job ${job?.id} failed: ${err?.message}`))
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => undefined)
  }

  private async scanStream(stream: Readable): Promise<{ infected: boolean; signature?: string }> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port })
      socket.once('error', (err) => {
        try { socket.destroy() } catch {}
        reject(err)
      })

      socket.write('zINSTREAM\0') // supports zlib compressed stream if daemon configured; falls back

      stream.on('data', (chunk: Buffer) => {
        const len = Buffer.alloc(4)
        len.writeUInt32BE(chunk.length, 0)
        socket.write(len)
        socket.write(chunk)
      })

      stream.on('end', () => {
        const zero = Buffer.alloc(4)
        zero.writeUInt32BE(0, 0)
        socket.write(zero)
      })

      let response = ''
      socket.on('data', (d) => { response += d.toString() })

      socket.on('end', () => {
        // Expected: 'stream: OK' or 'stream: <VIRUS> FOUND'
        const r = response.trim()
        if (r.includes('FOUND')) {
          const sig = r.split('FOUND')[0].split(':').pop()?.trim()
          resolve({ infected: true, signature: sig })
        } else if (r.includes('OK')) {
          resolve({ infected: false })
        } else {
          reject(new Error(`Unknown clamd response: ${r}`))
        }
      })
    })
  }
}
