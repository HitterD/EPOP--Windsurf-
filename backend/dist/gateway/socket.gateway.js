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
var SocketGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const redis_module_1 = require("../redis/redis.module");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_adapter_1 = require("@socket.io/redis-adapter");
let SocketGateway = SocketGateway_1 = class SocketGateway {
    sub;
    pub;
    logger = new common_1.Logger(SocketGateway_1.name);
    typingCooldowns = new Map();
    server;
    constructor(sub, pub) {
        this.sub = sub;
        this.pub = pub;
    }
    async onModuleInit() {
        if (this.server) {
            this.server.adapter((0, redis_adapter_1.createAdapter)(this.pub, this.sub));
        }
        await this.sub.psubscribe('epop.*');
        this.sub.on('pmessage', (_pattern, channel, message) => {
            try {
                const evt = JSON.parse(message);
                this.routeEvent(channel, evt);
            }
            catch (e) {
                this.logger.warn(`Invalid event on ${channel}: ${String(e)}`);
            }
        });
        this.logger.log('SocketGateway initialized and subscribed to epop.*');
    }
    async onModuleDestroy() {
        try {
            await this.sub.punsubscribe('epop.*');
        }
        catch { }
    }
    routeEvent(channel, evt) {
        const rooms = [];
        if (evt.chatId)
            rooms.push(`chat:${evt.chatId}`);
        if (evt.projectId)
            rooms.push(`project:${evt.projectId}`);
        if (evt.userId)
            rooms.push(`user:${evt.userId}`);
        if (rooms.length === 0 && evt.aggregateType && evt.aggregateId) {
            rooms.push(`${evt.aggregateType}:${evt.aggregateId}`);
        }
        const eventNameDot = channel.replace('epop.', '');
        const [domain, entity, action] = eventNameDot.split('.');
        const eventNameColon = (domain && entity && action) ? `${domain}:${entity}_${action}` : eventNameDot;
        const ids = Array.from(new Set([
            evt.aggregateId,
            evt.messageId,
            evt.taskId,
            evt.chatId,
            evt.projectId,
            evt.fileId,
            evt.mailId,
        ].filter(Boolean).map(String)));
        const payload = {
            ...evt,
            ids,
            patch: evt.patch ?? undefined,
            ts: evt.timestamp ?? new Date().toISOString(),
            actorId: evt.userId ?? null,
            requestId: evt.requestId ?? null,
        };
        for (const room of rooms) {
            this.server.to(room).emit(eventNameDot, payload);
            this.server.to(room).emit(eventNameColon, payload);
        }
    }
    handleJoinChat(socket, chatId) {
        socket.join(`chat:${chatId}`);
    }
    handleLeaveChat(socket, chatId) {
        socket.leave(`chat:${chatId}`);
    }
    handleJoinProject(socket, projectId) {
        socket.join(`project:${projectId}`);
    }
    handleLeaveProject(socket, projectId) {
        socket.leave(`project:${projectId}`);
    }
    handleJoinUser(socket, userId) {
        socket.join(`user:${userId}`);
    }
    handleLeaveUser(socket, userId) {
        socket.leave(`user:${userId}`);
    }
    handleTypingStart(socket, body) {
        const chatId = String(body?.chatId || '');
        const userId = String(body?.userId || '');
        if (!chatId || !userId)
            return;
        const key = `${chatId}:${userId}`;
        const now = Date.now();
        const last = this.typingCooldowns.get(key) || 0;
        if (now - last < 1000)
            return;
        this.typingCooldowns.set(key, now);
        this.server.to(`chat:${chatId}`).emit('chat:typing_start', { chatId, userId, userName: body?.userName });
        this.server.to(`chat:${chatId}`).emit('chat.typing.start', { chatId, userId, userName: body?.userName });
    }
    handleTypingStop(socket, body) {
        const chatId = String(body?.chatId || '');
        const userId = String(body?.userId || '');
        if (!chatId || !userId)
            return;
        this.server.to(`chat:${chatId}`).emit('chat:typing_stop', { chatId, userId });
        this.server.to(`chat:${chatId}`).emit('chat.typing.stop', { chatId, userId });
    }
    handleTypingStartDot(socket, body) {
        const chatId = String(body?.chatId || '');
        const userId = String(body?.userId || '');
        if (!chatId || !userId)
            return;
        const key = `${chatId}:${userId}`;
        const now = Date.now();
        const last = this.typingCooldowns.get(key) || 0;
        if (now - last < 1000)
            return;
        this.typingCooldowns.set(key, now);
        this.server.to(`chat:${chatId}`).emit('chat:typing_start', { chatId, userId, userName: body?.userName });
        this.server.to(`chat:${chatId}`).emit('chat.typing.start', { chatId, userId, userName: body?.userName });
    }
    handleTypingStopDot(socket, body) {
        const chatId = String(body?.chatId || '');
        const userId = String(body?.userId || '');
        if (!chatId || !userId)
            return;
        this.server.to(`chat:${chatId}`).emit('chat:typing_stop', { chatId, userId });
        this.server.to(`chat:${chatId}`).emit('chat.typing.stop', { chatId, userId });
    }
};
exports.SocketGateway = SocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_chat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleJoinChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_chat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleLeaveChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_project'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleJoinProject", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_project'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleLeaveProject", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_user'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleJoinUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_user'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleLeaveUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing_start'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing_stop'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleTypingStop", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat.typing.start'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleTypingStartDot", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat.typing.stop'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], SocketGateway.prototype, "handleTypingStopDot", null);
exports.SocketGateway = SocketGateway = SocketGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/ws', cors: { origin: true, credentials: true } }),
    __param(0, (0, common_1.Inject)(redis_module_1.REDIS_SUB)),
    __param(1, (0, common_1.Inject)(redis_module_1.REDIS_PUB)),
    __metadata("design:paramtypes", [ioredis_1.default, ioredis_1.default])
], SocketGateway);
//# sourceMappingURL=socket.gateway.js.map