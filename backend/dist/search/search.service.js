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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const message_entity_1 = require("../entities/message.entity");
const mail_message_entity_1 = require("../entities/mail-message.entity");
const file_entity_1 = require("../entities/file.entity");
const task_entity_1 = require("../entities/task.entity");
const axios_1 = __importDefault(require("axios"));
const prom_client_1 = require("prom-client");
const config_1 = require("@nestjs/config");
const node_http_1 = require("node:http");
const node_https_1 = require("node:https");
const cursor_1 = require("../common/pagination/cursor");
const bullmq_1 = require("bullmq");
const queues_module_1 = require("../queues/queues.module");
let SearchService = SearchService_1 = class SearchService {
    messages;
    mails;
    files;
    tasks;
    config;
    queue;
    logger = new common_1.Logger(SearchService_1.name);
    client;
    prefix;
    searchRequests;
    searchDuration;
    indexLag;
    constructor(messages, mails, files, tasks, config, queue) {
        this.messages = messages;
        this.mails = mails;
        this.files = files;
        this.tasks = tasks;
        this.config = config;
        this.queue = queue;
        const baseURL = this.config.get('ZINC_URL') || 'http://localhost:4080';
        const user = this.config.get('ZINC_USER') || 'admin';
        const pass = this.config.get('ZINC_PASS') || 'admin';
        this.prefix = this.config.get('ZINC_INDEX_PREFIX') || 'epop';
        const httpAgent = new node_http_1.Agent({ keepAlive: true, keepAliveMsecs: 20000, maxSockets: 128 });
        const httpsAgent = new node_https_1.Agent({ keepAlive: true, keepAliveMsecs: 20000, maxSockets: 128 });
        this.client = axios_1.default.create({
            baseURL,
            auth: { username: user, password: pass },
            timeout: 180000,
            httpAgent,
            httpsAgent,
            transitional: { clarifyTimeoutError: true },
        });
        this.searchRequests = new prom_client_1.Counter({ name: 'search_requests_total', help: 'Total search requests', labelNames: ['method'], registers: [prom_client_1.register] });
        this.searchDuration = new prom_client_1.Histogram({ name: 'search_duration_seconds', help: 'Search duration seconds', buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5], labelNames: ['method'], registers: [prom_client_1.register] });
        this.indexLag = new prom_client_1.Histogram({ name: 'search_index_lag_seconds', help: 'Time from entity creation to index write', buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300], registers: [prom_client_1.register] });
        this.client.interceptors.response.use(undefined, async (error) => {
            const cfg = error.config || {};
            cfg.__retries = (cfg.__retries ?? 0) + 1;
            const retriable = (error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ESOCKETTIMEDOUT' ||
                error.code === 'EAI_AGAIN' ||
                (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout')));
            if (cfg.__retries <= 5 && retriable) {
                const base = 300;
                const delay = Math.max(100, base * Math.pow(2, cfg.__retries));
                await new Promise((r) => setTimeout(r, delay));
                return this.client(cfg);
            }
            return Promise.reject(error);
        });
    }
    async enqueueBackfill(entity) {
        try {
            await this.queue.add('backfill', { entity }, { attempts: 3, backoff: { type: 'fixed', delay: 5000 }, removeOnComplete: 10, removeOnFail: 100 });
            return { enqueued: true };
        }
        catch (e) {
            this.logger.warn(`enqueue backfill failed: ${String(e?.message || e)}`);
            return { enqueued: false };
        }
    }
    async searchCursor(entity, q, userId, limit = 20, cursor = null) {
        const endTimer = this.searchDuration.startTimer({ method: 'cursor' });
        this.searchRequests.inc({ method: 'cursor' });
        const index = this.idx(entity);
        const decoded = (0, cursor_1.decodeCursor)(cursor);
        const off = Math.max(0, Number(decoded?.off ?? 0));
        const size = Math.max(1, Math.min(100, Number(limit))) + 1;
        try {
            const { data } = await this.client.post(`/api/${index}/_search`, { query: q, search_type: 'match', from: off, max_results: size });
            let hits = Array.isArray(data?.hits) ? data.hits : [];
            if (userId) {
                const allowed = await this.filterAccessible(index, hits, userId);
                hits = hits.filter((h) => allowed.has(this.extractId(h)));
            }
            const items = hits.slice(0, size - 1);
            const hasMore = hits.length === size;
            const nextCursor = hasMore ? (0, cursor_1.encodeCursor)({ off: off + (size - 1) }) : undefined;
            const res = { items, nextCursor, hasMore };
            endTimer();
            return res;
        }
        catch (e) {
            this.logger.warn(`search cursor failed for ${index}: ${String(e?.message || e)}`);
            endTimer();
            return { items: [], hasMore: false };
        }
    }
    idx(name) { return `${this.prefix}_${name}`; }
    async searchAll(q, userId) {
        const endTimer = this.searchDuration.startTimer({ method: 'all' });
        this.searchRequests.inc({ method: 'all' });
        const indices = [this.idx('messages'), this.idx('mail_messages'), this.idx('files'), this.idx('tasks')];
        const results = [];
        for (const index of indices) {
            try {
                const { data } = await this.client.post(`/api/${index}/_search`, { query: q, search_type: 'match', from: 0, max_results: 50 });
                let hits = Array.isArray(data?.hits) ? data.hits : [];
                if (userId) {
                    const allowed = await this.filterAccessible(index, hits, userId);
                    hits = hits.filter((h) => allowed.has(this.extractId(h)));
                }
                results.push({ index, hits });
            }
            catch (e) {
                this.logger.warn(`search failed for ${index}: ${String(e?.message || e)}`);
            }
        }
        const res = { results };
        endTimer();
        return res;
    }
    extractId(hit) {
        if (!hit)
            return '';
        return String((hit._id ?? hit.id ?? hit._source?.id ?? '').toString());
    }
    async filterAccessible(index, hits, userId) {
        const ids = hits.map((h) => this.extractId(h)).filter(Boolean);
        const set = new Set();
        if (!ids.length)
            return set;
        try {
            if (index.endsWith('_mail_messages')) {
                const rows = await this.mails.query(`SELECT id FROM mail_messages WHERE id = ANY($2::bigint[]) AND (from_user = $1 OR $1 = ANY(to_users))`, [userId, ids]);
                rows.forEach((r) => set.add(String(r.id)));
            }
            else if (index.endsWith('_messages')) {
                const rows = await this.messages.query(`SELECT m.id FROM messages m 
           JOIN chat_participants p ON p.chat_id = m.chat_id AND p.user_id = $1
           WHERE m.id = ANY($2::bigint[])`, [userId, ids]);
                rows.forEach((r) => set.add(String(r.id)));
            }
            else if (index.endsWith('_tasks')) {
                const rows = await this.tasks.query(`SELECT t.id FROM tasks t
           JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
           WHERE t.id = ANY($2::bigint[])`, [userId, ids]);
                rows.forEach((r) => set.add(String(r.id)));
            }
            else if (index.endsWith('_files')) {
                const rows = await this.files.query(`SELECT DISTINCT f.id
           FROM files f
           LEFT JOIN file_links l ON l.file_id = f.id
           LEFT JOIN messages m ON (l.ref_table = 'messages' AND l.ref_id = m.id)
           LEFT JOIN chat_participants p ON (p.chat_id = m.chat_id AND p.user_id = $1)
           WHERE f.id = ANY($2::bigint[]) AND (f.owner_id = $1 OR p.user_id IS NOT NULL)`, [userId, ids]);
                rows.forEach((r) => set.add(String(r.id)));
            }
        }
        catch (e) {
            this.logger.warn(`permission filter failed for ${index}: ${String(e?.message || e)}`);
        }
        return set;
    }
    async backfill(entity) {
        if (entity === 'messages') {
            const rows = await this.messages.find({ relations: { sender: true, chat: true } });
            for (const m of rows) {
                await this.indexDoc(this.idx('messages'), m.id, {
                    chatId: m.chat?.id,
                    senderId: m.sender?.id,
                    delivery: m.delivery,
                    createdAt: m.createdAt,
                    text: JSON.stringify(m.contentJson),
                });
            }
        }
        else if (entity === 'mail_messages') {
            const rows = await this.mails.find();
            for (const m of rows) {
                await this.indexDoc(this.idx('mail_messages'), m.id, {
                    fromUser: m.fromUser,
                    toUsers: m.toUsers,
                    subject: m.subject,
                    bodyHtml: m.bodyHtml,
                    folder: m.folder,
                    createdAt: m.createdAt,
                });
            }
        }
        else if (entity === 'files') {
            const rows = await this.files.find();
            for (const f of rows) {
                await this.indexDoc(this.idx('files'), f.id, {
                    ownerId: f.ownerId,
                    filename: f.filename,
                    mime: f.mime,
                    size: f.size,
                    createdAt: f.createdAt,
                });
            }
        }
        else if (entity === 'tasks') {
            const rows = await this.tasks.find({ relations: { project: true } });
            for (const t of rows) {
                await this.indexDoc(this.idx('tasks'), t.id, {
                    projectId: t.project?.id,
                    title: t.title,
                    description: t.description,
                    priority: t.priority,
                    progress: t.progress,
                    dueAt: t.dueAt,
                    createdAt: t.createdAt,
                });
            }
        }
        return { success: true };
    }
    async indexDoc(index, id, body) {
        try {
            await this.client.post(`/api/${index}/_doc/${id}`, body);
            try {
                if (body && body.createdAt) {
                    const ts = new Date(body.createdAt).getTime();
                    if (isFinite(ts)) {
                        const lagSec = Math.max(0, (Date.now() - ts) / 1000);
                        this.indexLag.observe(lagSec);
                    }
                }
            }
            catch { }
            return true;
        }
        catch (e) {
            this.logger.warn(`index ${index}/${id} failed: ${String(e?.message || e)}`);
            return false;
        }
    }
    async deleteDoc(index, id) {
        try {
            await this.client.delete(`/api/${index}/_doc/${id}`);
            return true;
        }
        catch (e) {
            this.logger.warn(`delete ${index}/${id} failed: ${String(e?.message || e)}`);
            return false;
        }
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = SearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(1, (0, typeorm_1.InjectRepository)(mail_message_entity_1.MailMessage)),
    __param(2, (0, typeorm_1.InjectRepository)(file_entity_1.FileEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(5, (0, common_1.Inject)(queues_module_1.SEARCH_QUEUE)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        bullmq_1.Queue])
], SearchService);
//# sourceMappingURL=search.service.js.map