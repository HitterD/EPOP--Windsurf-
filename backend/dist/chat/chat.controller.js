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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const chat_service_1 = require("./chat.service");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
const cursor_dto_1 = require("../common/dto/cursor.dto");
const message_entity_1 = require("../entities/message.entity");
const chat_entity_1 = require("../entities/chat.entity");
const success_dto_1 = require("../common/dto/success.dto");
const cursor_response_dto_1 = require("../common/dto/cursor-response.dto");
const requests_dto_1 = require("./dto/requests.dto");
let ChatController = class ChatController {
    chat;
    constructor(chat) {
        this.chat = chat;
    }
    async list(req) {
        return this.chat.listChats(req.user.userId);
    }
    async create(req, dto) {
        return this.chat.createChat(req.user.userId, dto);
    }
    async messages(req, chatId, limit, beforeId) {
        const lim = Math.max(1, Math.min(100, Number(limit ?? 20)));
        return this.chat.listMessages(req.user.userId, chatId, lim, beforeId);
    }
    async messagesCursor(req, chatId, params) {
        const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
        return this.chat.listMessagesCursor(req.user.userId, chatId, lim, params?.cursor || null);
    }
    async send(req, chatId, body) {
        return this.chat.sendMessage(req.user.userId, { chatId, content: body.content, delivery: body.delivery, rootMessageId: body.rootMessageId ?? null });
    }
    async thread(req, chatId, rootMessageId) {
        return this.chat.listThreadMessages(req.user.userId, chatId, rootMessageId);
    }
    async addReaction(req, chatId, body) {
        return this.chat.addReaction(req.user.userId, body);
    }
    async removeReaction(req, chatId, body) {
        return this.chat.removeReaction(req.user.userId, body);
    }
    async markRead(req, chatId, messageId) {
        return this.chat.markRead(req.user.userId, messageId);
    }
    async edit(req, chatId, messageId, dto) {
        return this.chat.editMessage(req.user.userId, messageId, { content: dto.content });
    }
    async remove(req, chatId, messageId) {
        return this.chat.deleteMessage(req.user.userId, messageId);
    }
    async unread(req) {
        return this.chat.unreadPerChat(req.user.userId);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOkResponse)({ type: chat_entity_1.Chat, isArray: true }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOkResponse)({ type: chat_entity_1.Chat }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_dto_1.CreateChatDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':chatId/messages'),
    (0, swagger_1.ApiOkResponse)({ type: message_entity_1.Message, isArray: true }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('beforeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "messages", null);
__decorate([
    (0, common_1.Get)(':chatId/messages/cursor'),
    (0, swagger_1.ApiOkResponse)({ type: cursor_response_dto_1.CursorMessagesResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cursor_dto_1.CursorParamsDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "messagesCursor", null);
__decorate([
    (0, common_1.Post)(':chatId/messages'),
    (0, swagger_1.ApiOkResponse)({ type: message_entity_1.Message }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, requests_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "send", null);
__decorate([
    (0, common_1.Get)(':chatId/threads'),
    (0, swagger_1.ApiOkResponse)({ type: message_entity_1.Message, isArray: true }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Query)('rootMessageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "thread", null);
__decorate([
    (0, common_1.Post)(':chatId/reactions'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, requests_dto_1.ReactionDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "addReaction", null);
__decorate([
    (0, common_1.Delete)(':chatId/reactions'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, requests_dto_1.ReactionDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "removeReaction", null);
__decorate([
    (0, common_1.Post)(':chatId/reads'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Body)('messageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)(':chatId/messages/:messageId/edit'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Param)('messageId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, requests_dto_1.EditMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "edit", null);
__decorate([
    (0, common_1.Delete)(':chatId/messages/:messageId'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('chatId')),
    __param(2, (0, common_1.Param)('messageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('unread'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "unread", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiTags)('chats'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('chats'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map