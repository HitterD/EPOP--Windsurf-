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
exports.DirectoryController = void 0;
const common_1 = require("@nestjs/common");
const directory_service_1 = require("./directory.service");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let DirectoryController = class DirectoryController {
    dir;
    constructor(dir) {
        this.dir = dir;
    }
    async tree() {
        return this.dir.tree();
    }
    async create(dto) {
        return this.dir.create(dto);
    }
    async update(id, dto) {
        return this.dir.update(id, dto);
    }
    async remove(id) {
        return this.dir.remove(id);
    }
    async move(req, id, parentId) {
        return this.dir.move(req.user.userId, id, parentId);
    }
    async users(id) {
        return this.dir.usersInOrg(id);
    }
    async moveUser(req, userId, orgId) {
        return this.dir.moveUserToOrg(req.user.userId, userId, orgId);
    }
    async importDryRun(file) {
        return this.dir.importDryRun(file?.buffer);
    }
    async importCommit(file) {
        return this.dir.importCommit(file?.buffer);
    }
};
exports.DirectoryController = DirectoryController;
__decorate([
    (0, common_1.Get)('tree'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "tree", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/move'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('parentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "move", null);
__decorate([
    (0, common_1.Get)(':id/users'),
    (0, swagger_1.ApiOkResponse)({ type: Object, isArray: true }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "users", null);
__decorate([
    (0, common_1.Post)('users/:userId/move'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)('orgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "moveUser", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('import/dry-run'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)(), limits: { fileSize: 5 * 1024 * 1024 } })),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "importDryRun", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)('import/commit'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)(), limits: { fileSize: 5 * 1024 * 1024 } })),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DirectoryController.prototype, "importCommit", null);
exports.DirectoryController = DirectoryController = __decorate([
    (0, swagger_1.ApiTags)('directory'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('directory'),
    __metadata("design:paramtypes", [directory_service_1.DirectoryService])
], DirectoryController);
//# sourceMappingURL=directory.controller.js.map