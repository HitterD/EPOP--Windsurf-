"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const file_entity_1 = require("../entities/file.entity");
const file_link_entity_1 = require("../entities/file-link.entity");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const uuid_1 = require("uuid");
const cursor_1 = require("../common/pagination/cursor");
const bullmq_1 = require("bullmq");
const queues_module_1 = require("../queues/queues.module");
let FilesService = class FilesService {
    files;
    links;
    config;
    searchQueue;
    fileScanQueue;
    s3;
    bucket;
    s3Secondary;
    bucketSecondary;
    constructor(files, links, config, searchQueue, fileScanQueue) {
        this.files = files;
        this.links = links;
        this.config = config;
        this.searchQueue = searchQueue;
        this.fileScanQueue = fileScanQueue;
        const endpoint = this.config.get('MINIO_ENDPOINT') || 'localhost';
        const port = this.config.get('MINIO_PORT') || 9000;
        const useSSL = !!this.config.get('MINIO_USE_SSL');
        const accessKeyId = this.config.get('MINIO_ACCESS_KEY') || 'minio';
        const secretAccessKey = this.config.get('MINIO_SECRET_KEY') || 'minio123';
        this.bucket = this.config.get('MINIO_BUCKET') || 'epop';
        this.s3 = new client_s3_1.S3Client({
            region: 'us-east-1',
            endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
            forcePathStyle: true,
            credentials: { accessKeyId, secretAccessKey },
        });
        const secondaryEnabled = String(this.config.get('S3_SECONDARY_ENABLED') || 'false').toLowerCase() === 'true';
        if (secondaryEnabled) {
            const secEndpoint = this.config.get('S3_SECONDARY_ENDPOINT') || '';
            const secPort = Number(this.config.get('S3_SECONDARY_PORT') || 9000);
            const secUseSSL = String(this.config.get('S3_SECONDARY_USE_SSL') || 'false').toLowerCase() === 'true';
            const secAccessKeyId = this.config.get('S3_SECONDARY_ACCESS_KEY') || '';
            const secSecretAccessKey = this.config.get('S3_SECONDARY_SECRET_KEY') || '';
            this.bucketSecondary = this.config.get('S3_SECONDARY_BUCKET') || this.bucket;
            if (secEndpoint && secAccessKeyId && secSecretAccessKey) {
                this.s3Secondary = new client_s3_1.S3Client({
                    region: 'us-east-1',
                    endpoint: `${secUseSSL ? 'https' : 'http'}://${secEndpoint}:${secPort}`,
                    forcePathStyle: true,
                    credentials: { accessKeyId: secAccessKeyId, secretAccessKey: secSecretAccessKey },
                });
            }
        }
    }
    async presign(ownerId, filename) {
        const key = `uploads-temp/${(0, uuid_1.v4)()}-${filename}`;
        const form = await (0, s3_presigned_post_1.createPresignedPost)(this.s3, {
            Bucket: this.bucket,
            Key: key,
            Conditions: [
                ['content-length-range', 1, 50 * 1024 * 1024],
            ],
            Expires: 300,
        });
        const file = await this.files.save(this.files.create({ ownerId: ownerId ?? null, filename, s3Key: key, mime: null, size: null }));
        const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();
        return { url: form.url, uploadUrl: form.url, fields: form.fields, fileId: file.id, key, expiresAt };
    }
    async attach(fileId, dto) {
        const file = await this.files.findOne({ where: { id: fileId } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        const maxBytes = 50 * 1024 * 1024;
        const size = dto.size ?? (file.size ? Number(file.size) : undefined);
        if (size && size > maxBytes)
            throw new common_1.ForbiddenException('File too large');
        const allowed = new Set([
            'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
            'application/pdf', 'text/plain', 'text/markdown',
            'application/json', 'application/zip', 'application/x-zip-compressed',
        ]);
        if (dto.mime && !allowed.has(dto.mime))
            throw new common_1.ForbiddenException('Unsupported file type');
        if (dto.filename !== undefined)
            file.filename = dto.filename;
        if (dto.mime !== undefined)
            file.mime = dto.mime ?? null;
        if (dto.size !== undefined)
            file.size = String(dto.size);
        await this.files.save(file);
        try {
            if (file.s3Key && file.s3Key.startsWith('uploads-temp/')) {
                const destKey = `uploads/${file.id}-${file.filename}`;
                if (destKey !== file.s3Key) {
                    const resp = await this.s3.send(new client_s3_1.CopyObjectCommand({ Bucket: this.bucket, CopySource: `/${this.bucket}/${file.s3Key}`, Key: destKey }));
                    try {
                        await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: file.s3Key }));
                    }
                    catch { }
                    file.s3Key = destKey;
                    try {
                        file.s3VersionId = resp?.VersionId ?? file.s3VersionId ?? null;
                    }
                    catch { }
                    await this.files.save(file);
                }
            }
        }
        catch { }
        try {
            file.status = 'scanning';
            await this.files.save(file);
            await this.fileScanQueue.add('scan', { fileId: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 });
        }
        catch { }
        const link = await this.links.save(this.links.create({ file: { id: fileId }, refTable: dto.refTable, refId: dto.refId }));
        try {
            await this.searchQueue.add('index_doc', { entity: 'files', id: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 });
        }
        catch { }
        return { success: true, linkId: link.id };
    }
    async get(id) {
        const file = await this.files.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        return file;
    }
    async remove(id) {
        const file = await this.files.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        await this.files.remove(file);
        try {
            await this.searchQueue.add('delete_doc', { entity: 'files', id: String(id) }, { attempts: 2, backoff: { type: 'fixed', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 });
        }
        catch { }
        return { success: true };
    }
    async listMineCursor(userId, limit = 20, cursor = null) {
        const where = { ownerId: userId };
        const decoded = (0, cursor_1.decodeCursor)(cursor);
        if (decoded?.id)
            where.id = (0, typeorm_2.LessThan)(decoded.id);
        const take = Math.max(1, Math.min(100, Number(limit))) + 1;
        const rows = await this.files.find({ where, order: { id: 'DESC' }, take });
        const items = rows.slice(0, take - 1).reverse();
        const hasMore = rows.length === take;
        const nextCursor = hasMore && items.length ? (0, cursor_1.encodeCursor)({ id: String(items[0].id) }) : undefined;
        return { items, nextCursor, hasMore };
    }
    async updateStatus(id, status, scanResult) {
        const file = await this.files.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        file.status = status;
        if (status === 'ready' || status === 'infected' || status === 'failed') {
            file.scanResult = scanResult;
            file.scannedAt = new Date();
        }
        await this.files.save(file);
        return { success: true };
    }
    async downloadToResponse(id, userId, res) {
        const file = await this.files.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        if (file.status === 'infected')
            throw new common_1.ForbiddenException('File blocked by antivirus');
        if (file.status !== 'ready')
            throw new common_1.ForbiddenException('File not ready');
        if (!userId)
            throw new common_1.ForbiddenException('Not permitted');
        if (!file.ownerId || String(file.ownerId) !== String(userId)) {
            const rows = await this.files.query(`SELECT 1 AS ok
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
         LIMIT 1`, [userId, id]);
            const allowed = rows && rows.length > 0;
            if (!allowed)
                throw new common_1.ForbiddenException('Not permitted');
        }
        const cmd = new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: file.s3Key });
        const obj = await this.s3.send(cmd);
        const body = obj.Body;
        const ct = obj.ContentType || file.mime || 'application/octet-stream';
        const cl = obj.ContentLength || (file.size ? Number(file.size) : undefined);
        res.setHeader('Content-Type', ct);
        if (cl && isFinite(cl))
            res.setHeader('Content-Length', String(cl));
        const filename = encodeURIComponent(file.filename || 'download');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return body.pipe(res);
    }
    async confirm(id) {
        const file = await this.files.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        try {
            if (file.s3Key && file.s3Key.startsWith('uploads-temp/')) {
                const destKey = `uploads/${file.id}-${file.filename}`;
                if (destKey !== file.s3Key) {
                    await this.s3.send(new client_s3_1.CopyObjectCommand({ Bucket: this.bucket, CopySource: `/${this.bucket}/${file.s3Key}`, Key: destKey }));
                    try {
                        await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: file.s3Key }));
                    }
                    catch { }
                    file.s3Key = destKey;
                    await this.files.save(file);
                }
            }
        }
        catch { }
        try {
            await this.replicateToSecondary(file);
        }
        catch { }
        try {
            await this.searchQueue.add('index_doc', { entity: 'files', id: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 });
        }
        catch { }
        try {
            file.status = 'scanning';
            await this.files.save(file);
            await this.fileScanQueue.add('scan', { fileId: String(file.id) }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 200, removeOnFail: 500 });
        }
        catch { }
        return file;
    }
    async purgeTemp(olderThanHours) {
        const cutoff = new Date(Date.now() - Math.max(1, olderThanHours) * 3600 * 1000);
        const rows = await this.files.query(`SELECT f.id, f.s3_key
       FROM files f
       LEFT JOIN file_links l ON l.file_id = f.id
       WHERE f.status = $1 AND f.created_at < $2 AND l.file_id IS NULL
       ORDER BY f.id ASC
       LIMIT 500`, ['pending', cutoff]);
        let deleted = 0;
        for (const r of rows) {
            try {
                await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: r.s3_key }));
            }
            catch { }
            try {
                await this.files.delete({ id: r.id });
                deleted++;
            }
            catch { }
        }
        return { deleted };
    }
    async listVersions(id) {
        const file = await this.files.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        try {
            const out = await this.s3.send(new client_s3_1.ListObjectVersionsCommand({ Bucket: this.bucket, Prefix: file.s3Key }));
            const versions = (out.Versions || [])
                .filter((v) => v.Key === file.s3Key)
                .map((v) => ({ versionId: v.VersionId, size: v.Size, isLatest: v.IsLatest, lastModified: v.LastModified }));
            return { key: file.s3Key, versions };
        }
        catch {
            return { key: file.s3Key, versions: [] };
        }
    }
    async updateRetention(id, policy) {
        const file = await this.files.findOne({ where: { id } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        file.retentionPolicy = policy;
        file.retentionExpiresAt = computeRetentionExpiry(policy);
        await this.files.save(file);
        return { success: true, retentionPolicy: file.retentionPolicy, retentionExpiresAt: file.retentionExpiresAt };
    }
    async purgeRetentionExpired(batch = 200) {
        const now = new Date();
        const rows = await this.files.query(`SELECT id, s3_key FROM files WHERE retention_expires_at IS NOT NULL AND retention_expires_at < $1 ORDER BY id ASC LIMIT $2`, [now, Math.max(1, batch)]);
        let deleted = 0;
        for (const r of rows) {
            try {
                await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: r.s3_key }));
                deleted++;
            }
            catch { }
            try {
                await this.files.delete({ id: r.id });
            }
            catch { }
        }
        return { deleted };
    }
    async replicateToSecondary(file) {
        if (!this.s3Secondary || !this.bucketSecondary)
            return { replicated: false };
        try {
            const obj = await this.s3.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: file.s3Key }));
            const body = obj.Body;
            await this.s3Secondary.send(new client_s3_1.PutObjectCommand({ Bucket: this.bucketSecondary, Key: file.s3Key, Body: body, ContentType: file.mime || 'application/octet-stream' }));
            return { replicated: true };
        }
        catch {
            return { replicated: false };
        }
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(file_link_entity_1.FileLink)),
    __param(3, (0, common_1.Inject)(queues_module_1.SEARCH_QUEUE)),
    __param(4, (0, common_1.Inject)(queues_module_1.FILESCAN_QUEUE)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        bullmq_1.Queue,
        bullmq_1.Queue])
], FilesService);
function computeRetentionExpiry(policy) {
    if (!policy)
        return null;
    const now = Date.now();
    const toDate = (ms) => new Date(now + ms);
    const day = 24 * 3600 * 1000;
    const map = {
        '30d': 30 * day,
        '90d': 90 * day,
        '1y': 365 * day,
        '7y': 7 * 365 * day,
        'permanent': 0,
    };
    const dur = map[policy];
    if (dur === undefined)
        return null;
    if (dur === 0)
        return null;
    return toDate(dur);
}
//# sourceMappingURL=files.service.js.map