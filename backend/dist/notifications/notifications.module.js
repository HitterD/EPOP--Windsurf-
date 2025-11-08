"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const redis_module_1 = require("../redis/redis.module");
const typeorm_1 = require("@nestjs/typeorm");
const chat_participant_entity_1 = require("../entities/chat-participant.entity");
const notification_preferences_entity_1 = require("../entities/notification-preferences.entity");
const notifications_controller_1 = require("./notifications.controller");
const mailer_module_1 = require("../mailer/mailer.module");
const user_entity_1 = require("../entities/user.entity");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [redis_module_1.RedisModule, mailer_module_1.MailerModule, typeorm_1.TypeOrmModule.forFeature([chat_participant_entity_1.ChatParticipant, notification_preferences_entity_1.NotificationPreferencesEntity, user_entity_1.User])],
        controllers: [notifications_controller_1.NotificationsController],
        providers: [notifications_service_1.NotificationsService],
        exports: [notifications_service_1.NotificationsService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map