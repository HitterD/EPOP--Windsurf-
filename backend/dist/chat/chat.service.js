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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_entity_1 = require("../entities/chat.entity");
const chat_participant_entity_1 = require("../entities/chat-participant.entity");
const message_entity_1 = require("../entities/message.entity");
const message_reaction_entity_1 = require("../entities/message-reaction.entity");
const message_read_entity_1 = require("../entities/message-read.entity");
const message_history_entity_1 = require("../entities/message-history.entity");
const outbox_service_1 = require("../events/outbox.service");
const cursor_1 = require("../common/pagination/cursor");
const redis_module_1 = require("../redis/redis.module");
const ioredis_1 = __importDefault(require("ioredis"));
const sanitize_html_1 = require("../common/utils/sanitize-html");
let ChatService = class ChatService {
    chats;
    participants;
    messages;
    reactions;
    reads;
    history;
    outbox;
    redis;
    constructor(chats, participants, messages, reactions, reads, history, outbox, redis) {
        this.chats = chats;
        this.participants = participants;
        this.messages = messages;
        this.reactions = reactions;
        this.reads = reads;
        this.history = history;
        this.outbox = outbox;
        this.redis = redis;
    }
    async listChats(userId) {
        const rows = await this.participants.find({ where: { userId }, relations: { chat: true } });
        return rows.map((r) => r.chat);
    }
    async listThreadMessages(userId, chatId, rootMessageId) {
        const isMember = await this.participants.findOne({ where: { chatId, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
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
            .orderBy('m.id', 'ASC');
        return qb.getMany();
    }
    async loadAggregates(ids) {
        const keys = ids.map((id) => `msgagg:${id}`);
        let cached = [];
        try {
            cached = await this.redis.mget(...keys);
        }
        catch {
            cached = [];
        }
        const result = new Map();
        const missing = [];
        for (let i = 0; i < ids.length; i++) {
            const id = String(ids[i]);
            const json = cached[i];
            if (json) {
                try {
                    const obj = JSON.parse(json);
                    result.set(id, { reac: Array.isArray(obj.reac) ? obj.reac : [], readCount: Number(obj.readCount || 0) });
                    continue;
                }
                catch { }
            }
            missing.push(id);
        }
        if (missing.length) {
            const [reacRows, readRows] = await Promise.all([
                this.reactions.query(`SELECT message_id, emoji, COUNT(*)::int AS cnt, ARRAY_AGG(user_id) AS user_ids FROM message_reactions WHERE message_id = ANY($1) GROUP BY message_id, emoji`, [missing]),
                this.reads.query(`SELECT message_id, COUNT(*)::int AS cnt FROM message_reads WHERE message_id = ANY($1) GROUP BY message_id`, [missing]),
            ]);
            const byMsgReac = new Map();
            for (const r of reacRows) {
                const arr = byMsgReac.get(String(r.message_id)) || [];
                arr.push({ emoji: r.emoji, count: Number(r.cnt), userIds: (r.user_ids || []).map(String) });
                byMsgReac.set(String(r.message_id), arr);
            }
            const byMsgRead = new Map();
            for (const rd of readRows)
                byMsgRead.set(String(rd.message_id), Number(rd.cnt));
            const pipe = this.redis.pipeline();
            for (const id of missing) {
                const val = { reac: byMsgReac.get(String(id)) || [], readCount: byMsgRead.get(String(id)) || 0 };
                result.set(String(id), val);
                try {
                    pipe.set(`msgagg:${id}`, JSON.stringify(val), { EX: 60 });
                }
                catch { }
            }
            try {
                await pipe.exec();
            }
            catch { }
        }
        return result;
    }
    async createChat(createdBy, dto) {
        const chat = await this.chats.save(this.chats.create({ isGroup: dto.isGroup, title: dto.title ?? null, createdBy: { id: createdBy } }));
        const parts = Array.from(new Set([createdBy, ...dto.participantIds]));
        await this.participants.save(parts.map((uid) => this.participants.create({ chatId: chat.id, userId: uid })));
        await this.outbox.append({ name: 'chat.participant.joined', aggregateType: 'chat', aggregateId: chat.id, userId: createdBy, payload: { chatId: chat.id, userId: createdBy } });
        return chat;
    }
    async listMessages(userId, chatId, limit = 20, beforeId) {
        const isMember = await this.participants.findOne({ where: { chatId, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
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
            .limit(Math.max(1, Math.min(100, Number(limit))));
        if (beforeId)
            qb.andWhere('m.id < :beforeId', { beforeId });
        const rows = await qb.getMany();
        const items = rows.reverse();
        if (!items.length)
            return items;
        const ids = items.map((m) => m.id);
        const agg = await this.loadAggregates(ids);
        return items.map((m) => {
            const a = agg.get(String(m.id)) || { reac: [], readCount: 0 };
            const reactionsSummary = (a.reac || []).map((r) => ({
                emoji: r.emoji,
                count: r.count,
                userIds: (r.userIds || []).map(String),
                hasCurrentUser: (r.userIds || []).map(String).includes(String(userId)),
            }));
            return { ...m, reactionsSummary, readCount: a.readCount };
        });
    }
    async listMessagesCursor(userId, chatId, limit = 20, cursor = null) {
        const isMember = await this.participants.findOne({ where: { chatId, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
        const decoded = (0, cursor_1.decodeCursor)(cursor);
        const take = Math.max(1, Math.min(100, Number(limit))) + 1;
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
            .limit(take);
        if (decoded?.id)
            qb.andWhere('m.id < :beforeId', { beforeId: decoded.id });
        const rows = await qb.getMany();
        const base = rows.slice(0, take - 1).reverse();
        let items = base;
        if (base.length) {
            const ids = base.map((m) => m.id);
            const agg = await this.loadAggregates(ids);
            items = base.map((m) => {
                const a = agg.get(String(m.id)) || { reac: [], readCount: 0 };
                const reactionsSummary = (a.reac || []).map((r) => ({
                    emoji: r.emoji,
                    count: r.count,
                    userIds: (r.userIds || []).map(String),
                    hasCurrentUser: (r.userIds || []).map(String).includes(String(userId)),
                }));
                return { ...m, reactionsSummary, readCount: a.readCount };
            });
        }
        const hasMore = rows.length === take;
        const nextCursor = hasMore && items.length ? (0, cursor_1.encodeCursor)({ id: String(items[0].id) }) : undefined;
        return { items, nextCursor, hasMore };
    }
    async sendMessage(userId, dto) {
        const isMember = await this.participants.findOne({ where: { chatId: dto.chatId, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
        let contentSan = dto.content;
        try {
            if (contentSan && typeof contentSan === 'object' && typeof contentSan.html === 'string') {
                contentSan = { ...contentSan, html: (0, sanitize_html_1.sanitizeHtml)(contentSan.html) };
            }
            else if (typeof contentSan === 'string') {
                contentSan = (0, sanitize_html_1.sanitizeHtml)(contentSan);
            }
        }
        catch { }
        const msg = await this.messages.save(this.messages.create({ chat: { id: dto.chatId }, sender: { id: userId }, contentJson: contentSan, delivery: dto.delivery ?? 'normal', rootMessage: dto.rootMessageId ? { id: dto.rootMessageId } : null }));
        await this.outbox.append({ name: 'chat.message.created', aggregateType: 'message', aggregateId: msg.id, userId, payload: { chatId: dto.chatId, messageId: msg.id, delivery: msg.delivery } });
        if (msg.delivery === 'urgent') {
            await this.outbox.append({ name: 'user.presence.updated', aggregateType: 'user', aggregateId: userId, userId, payload: { notify: 'urgent', chatId: dto.chatId, messageId: msg.id } });
        }
        try {
            await this.redis.del(`msgagg:${msg.id}`);
        }
        catch { }
        return msg;
    }
    async addReaction(userId, dto) {
        const message = await this.messages.findOne({ where: { id: dto.messageId }, relations: { chat: true } });
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
        await this.reactions.save(this.reactions.create({ messageId: dto.messageId, userId, emoji: dto.emoji }));
        await this.outbox.append({ name: 'chat.message.reaction.added', aggregateType: 'message', aggregateId: dto.messageId, userId, payload: { chatId: message.chat.id, emoji: dto.emoji } });
        try {
            await this.redis.del(`msgagg:${dto.messageId}`);
        }
        catch { }
        return { success: true };
    }
    async editMessage(userId, messageId, patch) {
        const message = await this.messages.findOne({ where: { id: messageId }, relations: { chat: true, sender: true } });
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
        if (!message.sender || String(message.sender.id) !== String(userId))
            throw new common_1.ForbiddenException('Only sender can edit');
        await this.history.save(this.history.create({ message: { id: messageId }, actor: { id: userId }, action: 'edited', prevContentJson: message.contentJson }));
        let contentSan = patch.content;
        try {
            if (contentSan && typeof contentSan === 'object' && typeof contentSan.html === 'string') {
                contentSan = { ...contentSan, html: (0, sanitize_html_1.sanitizeHtml)(contentSan.html) };
            }
            else if (typeof contentSan === 'string') {
                contentSan = (0, sanitize_html_1.sanitizeHtml)(contentSan);
            }
        }
        catch { }
        message.contentJson = contentSan;
        message.editedAt = new Date();
        await this.messages.save(message);
        await this.outbox.append({ name: 'chat.message.updated', aggregateType: 'message', aggregateId: messageId, userId, payload: { chatId: message.chat.id, messageId, patch: { contentJson: patch.content, editedAt: message.editedAt } } });
        return { success: true };
    }
    async deleteMessage(userId, messageId) {
        const message = await this.messages.findOne({ where: { id: messageId }, relations: { chat: true, sender: true } });
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
        if (!message.sender || String(message.sender.id) !== String(userId))
            throw new common_1.ForbiddenException('Only sender can delete');
        await this.history.save(this.history.create({ message: { id: messageId }, actor: { id: userId }, action: 'deleted', prevContentJson: message.contentJson }));
        await this.messages.softDelete({ id: messageId });
        await this.outbox.append({ name: 'chat.message.deleted', aggregateType: 'message', aggregateId: messageId, userId, payload: { chatId: message.chat.id, messageId } });
        try {
            await this.redis.del(`msgagg:${messageId}`);
        }
        catch { }
        return { success: true };
    }
    async removeReaction(userId, dto) {
        const message = await this.messages.findOne({ where: { id: dto.messageId }, relations: { chat: true } });
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
        await this.reactions.delete({ messageId: dto.messageId, userId, emoji: dto.emoji });
        await this.outbox.append({ name: 'chat.message.reaction.removed', aggregateType: 'message', aggregateId: dto.messageId, userId, payload: { chatId: message.chat.id, emoji: dto.emoji } });
        try {
            await this.redis.del(`msgagg:${dto.messageId}`);
        }
        catch { }
        return { success: true };
    }
    async markRead(userId, messageId) {
        const message = await this.messages.findOne({ where: { id: messageId }, relations: { chat: true } });
        if (!message)
            throw new common_1.NotFoundException('Message not found');
        const isMember = await this.participants.findOne({ where: { chatId: message.chat.id, userId } });
        if (!isMember)
            throw new common_1.ForbiddenException();
        await this.reads.save(this.reads.create({ messageId, userId, readAt: new Date() }));
        await this.outbox.append({ name: 'chat.message.read', aggregateType: 'message', aggregateId: messageId, userId, payload: { chatId: message.chat.id } });
        try {
            await this.redis.del(`msgagg:${messageId}`);
        }
        catch { }
        return { success: true };
    }
    async unreadPerChat(userId) {
        const rows = await this.messages.query(`
      SELECT m.chat_id, COUNT(*) AS unread
      FROM messages m
      LEFT JOIN message_reads r 
        ON r.message_id = m.id AND r.user_id = $1
      JOIN chat_participants p
        ON p.chat_id = m.chat_id AND p.user_id = $1
      WHERE r.message_id IS NULL AND m.sender_id <> $1
      GROUP BY m.chat_id;`, [userId]);
        return rows;
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __param(1, (0, typeorm_1.InjectRepository)(chat_participant_entity_1.ChatParticipant)),
    __param(2, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(3, (0, typeorm_1.InjectRepository)(message_reaction_entity_1.MessageReaction)),
    __param(4, (0, typeorm_1.InjectRepository)(message_read_entity_1.MessageRead)),
    __param(5, (0, typeorm_1.InjectRepository)(message_history_entity_1.MessageHistory)),
    __param(7, (0, common_1.Inject)(redis_module_1.REDIS_PUB)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        outbox_service_1.OutboxService,
        ioredis_1.default])
], ChatService);
//# sourceMappingURL=chat.service.js.map