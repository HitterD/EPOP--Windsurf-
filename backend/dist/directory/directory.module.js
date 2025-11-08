"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectoryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const directory_service_1 = require("./directory.service");
const directory_controller_1 = require("./directory.controller");
const org_unit_entity_1 = require("../entities/org-unit.entity");
const user_entity_1 = require("../entities/user.entity");
const directory_audit_entity_1 = require("../entities/directory-audit.entity");
const events_module_1 = require("../events/events.module");
let DirectoryModule = class DirectoryModule {
};
exports.DirectoryModule = DirectoryModule;
exports.DirectoryModule = DirectoryModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([org_unit_entity_1.OrgUnit, user_entity_1.User, directory_audit_entity_1.DirectoryAudit]), events_module_1.EventsModule],
        providers: [directory_service_1.DirectoryService],
        controllers: [directory_controller_1.DirectoryController],
    })
], DirectoryModule);
//# sourceMappingURL=directory.module.js.map