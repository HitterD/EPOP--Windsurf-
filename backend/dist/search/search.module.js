"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const search_service_1 = require("./search.service");
const search_controller_1 = require("./search.controller");
const message_entity_1 = require("../entities/message.entity");
const mail_message_entity_1 = require("../entities/mail-message.entity");
const file_entity_1 = require("../entities/file.entity");
const task_entity_1 = require("../entities/task.entity");
const search_subscriber_1 = require("./search.subscriber");
const queues_module_1 = require("../queues/queues.module");
let SearchModule = class SearchModule {
};
exports.SearchModule = SearchModule;
exports.SearchModule = SearchModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([message_entity_1.Message, mail_message_entity_1.MailMessage, file_entity_1.FileEntity, task_entity_1.Task]), queues_module_1.QueuesModule],
        providers: [search_service_1.SearchService, search_subscriber_1.SearchEventsSubscriber],
        controllers: [search_controller_1.SearchController],
    })
], SearchModule);
//# sourceMappingURL=search.module.js.map