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
exports.FileEntity = void 0;
const typeorm_1 = require("typeorm");
let FileEntity = class FileEntity {
    id;
    ownerId;
    filename;
    mime;
    size;
    s3Key;
    s3VersionId;
    status;
    scanResult;
    scannedAt;
    retentionPolicy;
    retentionExpiresAt;
    createdAt;
};
exports.FileEntity = FileEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], FileEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'owner_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], FileEntity.prototype, "filename", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "mime", void 0);
__decorate([
    (0, typeorm_1.Column)('bigint', { nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_key', type: 'text' }),
    __metadata("design:type", String)
], FileEntity.prototype, "s3Key", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 's3_version_id', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "s3VersionId", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { default: 'pending' }),
    __metadata("design:type", String)
], FileEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_result', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "scanResult", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scanned_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "scannedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retention_policy', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "retentionPolicy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retention_expires_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], FileEntity.prototype, "retentionExpiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }),
    __metadata("design:type", Date)
], FileEntity.prototype, "createdAt", void 0);
exports.FileEntity = FileEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'files' })
], FileEntity);
//# sourceMappingURL=file.entity.js.map