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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const redis_module_1 = require("../redis/redis.module");
const ioredis_1 = __importDefault(require("ioredis"));
const typeorm_1 = require("@nestjs/typeorm");
const chat_participant_entity_1 = require("../entities/chat-participant.entity");
const typeorm_2 = require("typeorm");
const notification_preferences_entity_1 = require("../entities/notification-preferences.entity");
const user_entity_1 = require("../entities/user.entity");
const mailer_service_1 = require("../mailer/mailer.service");
const bullmq_1 = require("bullmq");
const queues_module_1 = require("../queues/queues.module");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    sub;
    kv;
    parts;
    prefs;
    users;
    mailer;
    queue;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(sub, kv, parts, prefs, users, mailer, queue) {
        this.sub = sub;
        this.kv = kv;
        this.parts = parts;
        this.prefs = prefs;
        this.users = users;
        this.mailer = mailer;
        this.queue = queue;
    }
    async onModuleInit() {
        await this.sub.psubscribe('epop.chat.message.created');
        this.sub.on('pmessage', async (_pattern, channel, message) => {
            try {
                if (channel === 'epop.chat.message.created') {
                    const evt = JSON.parse(message);
                    await this.handleChatMessageCreated(evt);
                }
            }
            catch (e) {
                this.logger.warn(`notifications event error: ${String(e)}`);
            }
        });
    }
    async onModuleDestroy() {
        try {
            await this.sub.punsubscribe('epop.chat.message.created');
        }
        catch { }
    }
    async handleChatMessageCreated(evt) {
        if (!evt || !evt.chatId)
            return;
        if (evt.delivery !== 'urgent')
            return;
        const chatId = String(evt.chatId);
        const senderId = evt.userId ? String(evt.userId) : undefined;
        const dedupKey = `notify:dedup:chat:${chatId}:msg:${evt.messageId ?? ''}`;
        const set = await this.kv.set(dedupKey, '1', { NX: true, EX: 60 });
        if (set !== 'OK')
            return;
        const members = await this.parts.find({ where: { chatId } });
        const targets = members.map(m => m.userId).filter(uid => uid !== senderId);
        await Promise.all(targets.map((uid) => this.queue.add('push', { userId: String(uid), payload: { title: 'Urgent message', body: 'You have an urgent message', data: { chatId, messageId: evt.messageId } } }, { priority: 5, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 1000 })));
        await Promise.all(targets.map(async (uid) => {
            try {
                const p = await this.prefs.findOne({ where: { userId: String(uid) } });
                if (p && p.emailEnabled) {
                    const user = await this.users.findOne({ where: { id: String(uid) } });
                    const email = user?.email;
                    const emailKey = `notify:dedup:email:${uid}:chat:${chatId}:msg:${evt.messageId ?? ''}`;
                    const ok = await this.kv.set(emailKey, '1', { NX: true, EX: 300 });
                    if (ok === 'OK' && email) {
                        await this.mailer.sendGeneric(email, 'Urgent message', `You have an urgent message in chat ${chatId}`);
                    }
                }
            }
            catch { }
        }));
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(redis_module_1.REDIS_SUB)),
    __param(1, (0, common_1.Inject)(redis_module_1.REDIS_PUB)),
    __param(2, (0, typeorm_1.InjectRepository)(chat_participant_entity_1.ChatParticipant)),
    __param(3, (0, typeorm_1.InjectRepository)(notification_preferences_entity_1.NotificationPreferencesEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(6, (0, common_1.Inject)(queues_module_1.NOTIFICATION_QUEUE)),
    __metadata("design:paramtypes", [ioredis_1.default,
        ioredis_1.default,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        mailer_service_1.MailerService,
        bullmq_1.Queue])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map