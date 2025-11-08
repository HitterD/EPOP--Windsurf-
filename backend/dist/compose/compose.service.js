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
exports.ComposeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mail_message_entity_1 = require("../entities/mail-message.entity");
const outbox_service_1 = require("../events/outbox.service");
const sanitize_html_1 = require("../common/utils/sanitize-html");
let ComposeService = class ComposeService {
    mails;
    outbox;
    constructor(mails, outbox) {
        this.mails = mails;
        this.outbox = outbox;
    }
    async list(userId, folder, limit = 50, beforeId) {
        const qb = this.mails.createQueryBuilder('m');
        if (folder === 'sent') {
            qb.where('m.from_user = :userId', { userId });
        }
        else if (folder === 'received') {
            qb.where(':userId = ANY(m.to_users)', { userId });
        }
        else {
            qb.where('(m.from_user = :userId OR :userId = ANY(m.to_users)) AND m.folder = :folder', { userId, folder: 'deleted' });
        }
        if (beforeId)
            qb.andWhere('m.id < :beforeId', { beforeId });
        qb.orderBy('m.id', 'DESC').limit(limit);
        return qb.getMany();
    }
    async send(fromUser, dto) {
        const clean = (0, sanitize_html_1.sanitizeHtml)(dto.bodyHtml ?? null);
        const msg = await this.mails.save(this.mails.create({ fromUser, toUsers: dto.toUsers, subject: dto.subject ?? null, bodyHtml: clean, folder: 'sent' }));
        await this.outbox.append({ name: 'mail.message.created', aggregateType: 'mail', aggregateId: msg.id, userId: fromUser, payload: { mailId: msg.id, toUsers: dto.toUsers } });
        return msg;
    }
    async move(userId, id, folder) {
        const msg = await this.mails.findOne({ where: { id } });
        if (!msg)
            throw new common_1.NotFoundException('Mail not found');
        msg.folder = folder;
        await this.mails.save(msg);
        await this.outbox.append({ name: 'mail.message.moved', aggregateType: 'mail', aggregateId: id, userId, payload: { folder } });
        return { success: true };
    }
};
exports.ComposeService = ComposeService;
exports.ComposeService = ComposeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(mail_message_entity_1.MailMessage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        outbox_service_1.OutboxService])
], ComposeService);
//# sourceMappingURL=compose.service.js.map