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
exports.PresenceController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const presence_service_1 = require("./presence.service");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
const success_dto_1 = require("../common/dto/success.dto");
let PresenceController = class PresenceController {
    presence;
    constructor(presence) {
        this.presence = presence;
    }
    async heartbeat(req, ttl) {
        return this.presence.heartbeat(req.user.userId, ttl ?? 60);
    }
    async me(req) {
        return this.presence.get(req.user.userId);
    }
};
exports.PresenceController = PresenceController;
__decorate([
    (0, common_1.Post)('heartbeat'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('ttl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], PresenceController.prototype, "heartbeat", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PresenceController.prototype, "me", null);
exports.PresenceController = PresenceController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiTags)('presence'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('presence'),
    __metadata("design:paramtypes", [presence_service_1.PresenceService])
], PresenceController);
//# sourceMappingURL=presence.controller.js.map