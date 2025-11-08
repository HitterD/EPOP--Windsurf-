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
var SearchEventsSubscriber_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchEventsSubscriber = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_module_1 = require("../redis/redis.module");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const queues_module_1 = require("../queues/queues.module");
let SearchEventsSubscriber = SearchEventsSubscriber_1 = class SearchEventsSubscriber {
    sub;
    queue;
    logger = new common_1.Logger(SearchEventsSubscriber_1.name);
    prefix;
    constructor(sub, queue, config) {
        this.sub = sub;
        this.queue = queue;
        this.prefix = config.get('ZINC_INDEX_PREFIX') || 'epop';
    }
    idx(name) { return `${this.prefix}_${name}`; }
    async onModuleInit() {
        await this.sub.psubscribe('epop.chat.message.created', 'epop.chat.message.updated', 'epop.chat.message.deleted', 'epop.project.task.created', 'epop.project.task.updated', 'epop.project.task.moved', 'epop.project.task.rescheduled', 'epop.mail.message.created');
        this.sub.on('pmessage', async (_p, channel, message) => {
            try {
                const evt = JSON.parse(message);
                if (channel === 'epop.chat.message.created') {
                    await this.onMessageCreated(evt);
                }
                else if (channel === 'epop.chat.message.updated') {
                    await this.onMessageUpdated(evt);
                }
                else if (channel === 'epop.chat.message.deleted') {
                    await this.onMessageDeleted(evt);
                }
                else if (channel === 'epop.project.task.created') {
                    await this.onTaskCreated(evt);
                }
                else if (channel === 'epop.project.task.updated' || channel === 'epop.project.task.moved' || channel === 'epop.project.task.rescheduled') {
                    await this.onTaskUpdated(evt);
                }
                else if (channel === 'epop.mail.message.created') {
                    await this.onMailCreated(evt);
                }
            }
            catch (e) {
                this.logger.warn(`search subscriber error: ${String(e)}`);
            }
        });
    }
    async onModuleDestroy() {
        try {
            await this.sub.punsubscribe('epop.chat.message.created', 'epop.chat.message.updated', 'epop.chat.message.deleted', 'epop.project.task.created', 'epop.project.task.updated', 'epop.project.task.moved', 'epop.project.task.rescheduled', 'epop.mail.message.created');
        }
        catch { }
    }
    async onMessageCreated(evt) {
        if (!evt?.messageId)
            return;
        await this.queue.add('index_doc', { entity: 'messages', id: String(evt.messageId) }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 });
    }
    async onMessageUpdated(evt) {
        if (!evt?.messageId)
            return;
        await this.queue.add('index_doc', { entity: 'messages', id: String(evt.messageId) }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 });
    }
    async onMessageDeleted(evt) {
        if (!evt?.messageId)
            return;
        await this.queue.add('delete_doc', { entity: 'messages', id: String(evt.messageId) }, { attempts: 3, backoff: { type: 'fixed', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 });
    }
    async onTaskCreated(evt) {
        if (!evt?.taskId)
            return;
        await this.queue.add('index_doc', { entity: 'tasks', id: String(evt.taskId) }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 });
    }
    async onTaskUpdated(evt) {
        const id = String(evt?.taskId || evt?.aggregateId || '');
        if (!id)
            return;
        await this.queue.add('index_doc', { entity: 'tasks', id }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 });
    }
    async onMailCreated(evt) {
        if (!evt?.mailId)
            return;
        await this.queue.add('index_doc', { entity: 'mail_messages', id: String(evt.mailId) }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 });
    }
};
exports.SearchEventsSubscriber = SearchEventsSubscriber;
exports.SearchEventsSubscriber = SearchEventsSubscriber = SearchEventsSubscriber_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(redis_module_1.REDIS_SUB)),
    __param(1, (0, common_1.Inject)(queues_module_1.SEARCH_QUEUE)),
    __metadata("design:paramtypes", [ioredis_1.default,
        bullmq_1.Queue,
        config_1.ConfigService])
], SearchEventsSubscriber);
//# sourceMappingURL=search.subscriber.js.map