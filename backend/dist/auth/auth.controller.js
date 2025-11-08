"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const common_2 = require("@nestjs/common");
const redis_module_1 = require("../redis/redis.module");
const ioredis_1 = __importDefault(require("ioredis"));
const argon2 = __importStar(require("argon2"));
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../entities/user.entity");
const typeorm_2 = require("typeorm");
const mailer_service_1 = require("../mailer/mailer.service");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
const success_dto_1 = require("../common/dto/success.dto");
const node_crypto_1 = require("node:crypto");
const outbox_service_1 = require("../events/outbox.service");
let AuthController = class AuthController {
    auth;
    config;
    redis;
    users;
    mailer;
    outbox;
    constructor(auth, config, redis, users, mailer, outbox) {
        this.auth = auth;
        this.config = config;
        this.redis = redis;
        this.users = users;
        this.mailer = mailer;
        this.outbox = outbox;
    }
    cookieOpts(maxAgeSeconds) {
        const domain = this.config.get('COOKIE_DOMAIN') || 'localhost';
        const secure = (this.config.get('NODE_ENV') || 'development') === 'production';
        return {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            domain,
            path: '/',
            maxAge: maxAgeSeconds * 1000,
        };
    }
    async login(dto, req, res) {
        const user = await this.auth.validateUser(dto.email, dto.password);
        const sessionId = (0, node_crypto_1.randomUUID)();
        const accessToken = await this.auth.signAccessToken(user, sessionId);
        const { token: refreshToken, jti } = await this.auth.signRefreshToken(user, sessionId);
        const accessTtl = this.config.get('JWT_ACCESS_TTL') ?? 900;
        const refreshTtl = this.config.get('JWT_REFRESH_TTL') ?? 1209600;
        res.cookie('accessToken', accessToken, this.cookieOpts(accessTtl));
        res.cookie('refreshToken', refreshToken, this.cookieOpts(refreshTtl));
        const now = new Date().toISOString();
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        const ua = req.headers['user-agent'] || '';
        await this.redis.sadd(`sess:user:${user.id}`, sessionId);
        await this.redis.set(`sess:data:${sessionId}`, JSON.stringify({ id: sessionId, userId: String(user.id), ipAddress: ip, userAgent: ua, deviceName: '', deviceType: 'desktop', lastActiveAt: now, createdAt: now }), 'EX', Math.max(3600, refreshTtl));
        await this.redis.set(`sess:jti:${sessionId}`, jti, 'EX', Math.max(3600, refreshTtl));
        return { success: true };
    }
    async refresh(req, res) {
        const token = req.cookies?.refreshToken;
        if (!token)
            throw new common_1.UnauthorizedException('Missing refresh token');
        const payload = await this.auth.verifyRefreshToken(token);
        if (payload.typ !== 'refresh')
            throw new common_1.UnauthorizedException('Invalid token');
        const sessionId = String(payload.sid || '');
        const jti = String(payload.jti || '');
        if (!sessionId || !jti)
            throw new common_1.UnauthorizedException('Invalid token');
        const saved = await this.redis.get(`sess:jti:${sessionId}`);
        if (!saved || saved !== jti)
            throw new common_1.UnauthorizedException('Token revoked');
        const accessTtl = this.config.get('JWT_ACCESS_TTL') ?? 900;
        const refreshTtl = this.config.get('JWT_REFRESH_TTL') ?? 1209600;
        const user = await this.users.findOne({ where: { id: payload.sub } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const accessToken = await this.auth.signAccessToken(user, sessionId);
        const { token: refreshToken, jti: newJti } = await this.auth.signRefreshToken(user, sessionId);
        res.cookie('accessToken', accessToken, this.cookieOpts(accessTtl));
        res.cookie('refreshToken', refreshToken, this.cookieOpts(refreshTtl));
        await this.redis.set(`sess:jti:${sessionId}`, newJti, 'EX', Math.max(3600, refreshTtl));
        await this.redis.get(`sess:data:${sessionId}`).then((json) => {
            if (json) {
                try {
                    const data = JSON.parse(json);
                    data.lastActiveAt = new Date().toISOString();
                    this.redis.set(`sess:data:${sessionId}`, JSON.stringify(data), 'EX', Math.max(3600, refreshTtl));
                }
                catch { }
            }
        });
        return { success: true };
    }
    async logout(res) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return { success: true };
    }
    async forgot(req, email) {
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const ttl = this.config.get('PWD_RESET_TTL') ?? 1800;
        await this.redis.set(`pwdreset:${email}`, token, 'EX', Math.max(300, ttl));
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        const ua = req.headers['user-agent'] || '';
        await this.outbox.append({
            name: 'user.password.reset.requested',
            aggregateType: 'user',
            aggregateId: '0',
            userId: undefined,
            payload: { email, ip, ua },
        });
        await this.mailer.sendPasswordReset(email, token);
        return { success: true };
    }
    async reset(req, body) {
        let saved = null;
        const key = `pwdreset:${body.email}`;
        const client = this.redis;
        if (typeof client.getdel === 'function') {
            saved = await client.getdel(key);
        }
        else {
            saved = await this.redis.get(key);
            if (saved)
                await this.redis.del(key);
        }
        if (!saved || saved !== body.token)
            throw new common_1.UnauthorizedException('Invalid reset token');
        const user = await this.users.findOne({ where: { email: body.email } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        user.passwordHash = await argon2.hash(body.password);
        await this.users.save(user);
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        const ua = req.headers['user-agent'] || '';
        await this.outbox.append({
            name: 'user.password.reset.completed',
            aggregateType: 'user',
            aggregateId: user.id,
            userId: user.id,
            payload: { email: body.email, ip, ua },
        });
        return { success: true };
    }
    async subscribePush(req, body) {
        const userId = req.user.userId;
        await this.redis.set(`push:user:${userId}`, JSON.stringify(body));
        return { success: true };
    }
    async listSessions(req) {
        const userId = String(req.user.userId);
        const currentSid = String(req.user.sid || '');
        const sids = await this.redis.smembers(`sess:user:${userId}`);
        const items = [];
        for (const sid of sids) {
            const json = await this.redis.get(`sess:data:${sid}`);
            if (json) {
                try {
                    const d = JSON.parse(json);
                    items.push({
                        id: sid,
                        userId,
                        deviceName: d.deviceName || 'Device',
                        deviceType: d.deviceType || 'desktop',
                        ipAddress: d.ipAddress || '',
                        userAgent: d.userAgent || '',
                        lastActiveAt: d.lastActiveAt || d.createdAt,
                        createdAt: d.createdAt,
                        isCurrent: sid === currentSid,
                    });
                }
                catch { }
            }
        }
        items.sort((a, b) => String(b.lastActiveAt).localeCompare(String(a.lastActiveAt)));
        return items;
    }
    async revokeSession(req, sid) {
        const userId = String(req.user.userId);
        const belongs = await this.redis.sismember(`sess:user:${userId}`, sid);
        if (!belongs)
            throw new common_1.UnauthorizedException('Session not found');
        await this.redis.srem(`sess:user:${userId}`, sid);
        await this.redis.del(`sess:data:${sid}`);
        await this.redis.del(`sess:jti:${sid}`);
        return { success: true };
    }
    async revokeAllSessions(req) {
        const userId = String(req.user.userId);
        const currentSid = String(req.user.sid || '');
        const sids = await this.redis.smembers(`sess:user:${userId}`);
        const toRemove = sids.filter((s) => s !== currentSid);
        if (toRemove.length) {
            await this.redis.srem(`sess:user:${userId}`, ...toRemove);
            for (const sid of toRemove) {
                await this.redis.del(`sess:data:${sid}`);
                await this.redis.del(`sess:jti:${sid}`);
            }
        }
        return { success: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('password/forgot'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgot", null);
__decorate([
    (0, common_1.Post)('password/reset'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "reset", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('push/subscribe'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "subscribePush", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "listSessions", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)('sessions/:id'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('sessions/revoke-all'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeAllSessions", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('auth'),
    __param(2, (0, common_2.Inject)(redis_module_1.REDIS_PUB)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService,
        ioredis_1.default,
        typeorm_2.Repository,
        mailer_service_1.MailerService,
        outbox_service_1.OutboxService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map