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
var MailerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const queues_module_1 = require("../queues/queues.module");
let MailerService = MailerService_1 = class MailerService {
    config;
    queue;
    logger = new common_1.Logger(MailerService_1.name);
    from;
    constructor(config, queue) {
        this.config = config;
        this.queue = queue;
        this.from = this.config.get('MAIL_FROM') || 'noreply@epop.local';
    }
    async sendPasswordReset(email, token) {
        try {
            const subject = 'EPOP Password Reset';
            const text = `Use this token to reset your password: ${token}`;
            await this.queue.add('password_reset', { to: email, from: this.from, subject, text }, { priority: 1, attempts: 5, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 1000 });
            return true;
        }
        catch (e) {
            this.logger.warn(`queue password reset failed: ${String(e)}`);
            return false;
        }
    }
    async sendGeneric(to, subject, text) {
        try {
            await this.queue.add('generic', { to, from: this.from, subject, text }, { priority: 5, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 1000 });
            return true;
        }
        catch (e) {
            this.logger.warn(`queue generic email failed: ${String(e)}`);
            return false;
        }
    }
    async sendHtml(to, subject, html) {
        try {
            await this.queue.add('generic', { to, from: this.from, subject, html }, { priority: 5, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 1000 });
            return true;
        }
        catch (e) {
            this.logger.warn(`queue html email failed: ${String(e)}`);
            return false;
        }
    }
    async sendTestEmail(to) {
        const subject = 'EPOP Test Email';
        const html = this.renderTemplate('test', { to });
        return this.sendHtml(to, subject, html);
    }
    async sendReminderEmail(to, model) {
        const subject = `Reminder: ${model.title}`;
        const html = this.renderTemplate('reminder', model);
        return this.sendHtml(to, subject, html);
    }
    renderTemplate(name, model) {
        if (name === 'test') {
            return `<!doctype html><html><body><h2>EPOP Test Email</h2><p>This is a test email for <b>${escapeHtml(model.to || '')}</b>.</p><p>It works! 🎉</p></body></html>`;
        }
        if (name === 'reminder') {
            const title = escapeHtml(model.title || '');
            const start = escapeHtml(model.start || '');
            const location = model.location ? `<p><b>Location:</b> ${escapeHtml(model.location)}</p>` : '';
            return `<!doctype html><html><body><h2>Event Reminder</h2><p><b>${title}</b></p><p><b>Starts:</b> ${start}</p>${location}</body></html>`;
        }
        return `<html><body><p>No template</p></body></html>`;
    }
};
exports.MailerService = MailerService;
exports.MailerService = MailerService = MailerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(queues_module_1.EMAIL_QUEUE)),
    __metadata("design:paramtypes", [config_1.ConfigService, bullmq_1.Queue])
], MailerService);
function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
//# sourceMappingURL=mailer.service.js.map