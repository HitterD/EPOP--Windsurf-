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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const passport_1 = require("@nestjs/passport");
const update_me_dto_1 = require("./dto/update-me.dto");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
const user_entity_1 = require("../entities/user.entity");
const success_dto_1 = require("../common/dto/success.dto");
let UsersController = class UsersController {
    users;
    constructor(users) {
        this.users = users;
    }
    async me(req) {
        return this.users.me(req.user.userId);
    }
    async updateMe(req, dto) {
        return this.users.updateMe(req.user.userId, dto);
    }
    async presence(req, presence) {
        return this.users.setPresence(req.user.userId, presence);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOkResponse)({ type: user_entity_1.User }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiOkResponse)({ type: user_entity_1.User }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_me_dto_1.UpdateMeDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('me/presence'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('presence')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "presence", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiTags)('users'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map