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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const admin_service_1 = require("./admin.service");
const multer_1 = require("multer");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
let AdminController = class AdminController {
    admin;
    constructor(admin) {
        this.admin = admin;
    }
    async bulk(file) {
        if (!file || !file.buffer)
            throw new common_1.BadRequestException('Missing CSV file');
        const name = (file.originalname || '').toLowerCase();
        const type = (file.mimetype || '').toLowerCase();
        const looksCsv = name.endsWith('.csv') || type === 'text/csv' || type === 'application/vnd.ms-excel';
        if (!looksCsv)
            throw new common_1.BadRequestException('Invalid file type, expected CSV');
        return this.admin.bulkImportUsersFromCSV(file.buffer);
    }
    async analytics() {
        return this.admin.analyticsSummary();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('users/bulk-import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)(), limits: { fileSize: 5 * 1024 * 1024 } })),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "bulk", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "analytics", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiTags)('admin'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map