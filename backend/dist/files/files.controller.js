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
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const files_service_1 = require("./files.service");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const cursor_dto_1 = require("../common/dto/cursor.dto");
const presign_response_dto_1 = require("./dto/presign-response.dto");
const attach_response_dto_1 = require("./dto/attach-response.dto");
const success_dto_1 = require("../common/dto/success.dto");
const file_entity_1 = require("../entities/file.entity");
const cursor_response_dto_1 = require("../common/dto/cursor-response.dto");
let FilesController = class FilesController {
    files;
    constructor(files) {
        this.files = files;
    }
    async presign(req, body) {
        const fname = (body?.filename || body?.fileName || '').toString();
        return this.files.presign(req.user?.userId ?? null, fname);
    }
    async attach(body) {
        return this.files.attach(body.fileId, body);
    }
    async download(id, req, res) {
        return this.files.downloadToResponse(id, req.user?.userId ?? null, res);
    }
    async listMineCursor(req, params) {
        const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
        return this.files.listMineCursor(req.user.userId, lim, params?.cursor || null);
    }
    async listMine(req, params) {
        const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
        return this.files.listMineCursor(req.user.userId, lim, params?.cursor || null);
    }
    async get(id) {
        return this.files.get(id);
    }
    async updateStatus(id, body) {
        return this.files.updateStatus(id, body.status, body.scanResult ?? null);
    }
    async confirm(id) {
        return this.files.confirm(id);
    }
    async purgeTemp(olderThanHours) {
        const hours = Math.max(1, Number(olderThanHours ?? 24));
        return this.files.purgeTemp(hours);
    }
    async versions(id) {
        return this.files.listVersions(id);
    }
    async updateRetention(id, body) {
        const policy = (body?.policy ?? null);
        return this.files.updateRetention(id, policy);
    }
    async purgeRetention(batch) {
        const size = Math.max(1, Math.min(1000, Number(batch ?? 200)));
        return this.files.purgeRetentionExpired(size);
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Post)('presign'),
    (0, swagger_1.ApiOkResponse)({ type: presign_response_dto_1.PresignResponseDto }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "presign", null);
__decorate([
    (0, common_1.Post)('attach'),
    (0, swagger_1.ApiOkResponse)({ type: attach_response_dto_1.AttachResponseDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "attach", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "download", null);
__decorate([
    (0, common_1.Get)('mine/cursor'),
    (0, swagger_1.ApiOkResponse)({ type: cursor_response_dto_1.CursorFilesResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cursor_dto_1.CursorParamsDto]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "listMineCursor", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOkResponse)({ type: cursor_response_dto_1.CursorFilesResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cursor_dto_1.CursorParamsDto]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOkResponse)({ type: file_entity_1.FileEntity }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: success_dto_1.SuccessResponse }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    (0, swagger_1.ApiOkResponse)({ type: file_entity_1.FileEntity }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)('purge-temp'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Body)('olderThanHours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "purgeTemp", null);
__decorate([
    (0, common_1.Get)(':id/versions'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "versions", null);
__decorate([
    (0, common_1.Patch)(':id/retention'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "updateRetention", null);
__decorate([
    (0, common_1.Post)('purge-retention'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Body)('batch')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "purgeRetention", null);
exports.FilesController = FilesController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiTags)('files'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('files'),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], FilesController);
//# sourceMappingURL=files.controller.js.map