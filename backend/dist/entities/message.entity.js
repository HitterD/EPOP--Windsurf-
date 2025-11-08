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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const typeorm_1 = require("typeorm");
const chat_entity_1 = require("./chat.entity");
const user_entity_1 = require("./user.entity");
const message_reaction_entity_1 = require("./message-reaction.entity");
const message_read_entity_1 = require("./message-read.entity");
let Message = class Message {
    id;
    chat;
    sender;
    contentJson;
    delivery;
    rootMessage;
    threadReplies;
    createdAt;
    editedAt;
    reactions;
    reads;
    deletedAt;
};
exports.Message = Message;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], Message.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => chat_entity_1.Chat, (c) => c.messages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'chat_id' }),
    __metadata("design:type", chat_entity_1.Chat)
], Message.prototype, "chat", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'sender_id' }),
    __metadata("design:type", Object)
], Message.prototype, "sender", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'content_json', type: 'jsonb' }),
    __metadata("design:type", Object)
], Message.prototype, "contentJson", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { default: 'normal' }),
    __metadata("design:type", String)
], Message.prototype, "delivery", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Message, (m) => m.threadReplies, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'root_message_id' }),
    __metadata("design:type", Object)
], Message.prototype, "rootMessage", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Message, (m) => m.rootMessage),
    __metadata("design:type", Array)
], Message.prototype, "threadReplies", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }),
    __metadata("design:type", Date)
], Message.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'edited_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Message.prototype, "editedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_reaction_entity_1.MessageReaction, (r) => r.message),
    __metadata("design:type", Array)
], Message.prototype, "reactions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_read_entity_1.MessageRead, (r) => r.message),
    __metadata("design:type", Array)
], Message.prototype, "reads", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Message.prototype, "deletedAt", void 0);
exports.Message = Message = __decorate([
    (0, typeorm_1.Entity)({ name: 'messages' })
], Message);
//# sourceMappingURL=message.entity.js.map