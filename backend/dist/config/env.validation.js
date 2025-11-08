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
exports.EnvironmentVariables = exports.NodeEnv = void 0;
exports.validate = validate;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var NodeEnv;
(function (NodeEnv) {
    NodeEnv["Development"] = "development";
    NodeEnv["Production"] = "production";
    NodeEnv["Test"] = "test";
})(NodeEnv || (exports.NodeEnv = NodeEnv = {}));
class EnvironmentVariables {
    NODE_ENV;
    PORT;
    DB_HOST;
    DB_PORT;
    DB_USER;
    DB_PASS;
    DB_NAME;
    REDIS_URL;
    MINIO_ENDPOINT;
    MINIO_PORT;
    MINIO_ACCESS_KEY;
    MINIO_SECRET_KEY;
    MINIO_BUCKET;
    MINIO_USE_SSL;
    ZINC_URL;
    ZINC_USER;
    ZINC_PASS;
    ZINC_INDEX_PREFIX;
    SMTP_HOST;
    SMTP_PORT;
    SMTP_USER;
    SMTP_PASS;
    SMTP_SECURE;
    MAIL_FROM;
    S3_SECONDARY_ENABLED;
    S3_SECONDARY_ENDPOINT;
    S3_SECONDARY_PORT;
    S3_SECONDARY_ACCESS_KEY;
    S3_SECONDARY_SECRET_KEY;
    S3_SECONDARY_BUCKET;
    S3_SECONDARY_USE_SSL;
    VAPID_PUBLIC_KEY;
    VAPID_PRIVATE_KEY;
    VAPID_SUBJECT;
    CORS_ORIGIN;
    RATE_LIMIT_WINDOW_MS;
    RATE_LIMIT_MAX;
    EMAIL_WORKER_CONCURRENCY;
    SEARCH_WORKER_CONCURRENCY;
    NOTIFICATION_WORKER_CONCURRENCY;
    JWT_ACCESS_SECRET;
    JWT_REFRESH_SECRET;
    JWT_ACCESS_TTL;
    JWT_REFRESH_TTL;
    COOKIE_DOMAIN;
    ICS_FEED_SECRET;
    TYPEORM_LOGGING;
    TYPEORM_SLOW_QUERY_THRESHOLD_MS;
    TYPEORM_SLOW_QUERY_LOG_FILE;
}
exports.EnvironmentVariables = EnvironmentVariables;
__decorate([
    (0, class_validator_1.IsEnum)(NodeEnv),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "NODE_ENV", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_HOST", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "DB_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_USER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_PASS", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DB_NAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "REDIS_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "MINIO_ENDPOINT", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "MINIO_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "MINIO_ACCESS_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "MINIO_SECRET_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "MINIO_BUCKET", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EnvironmentVariables.prototype, "MINIO_USE_SSL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "ZINC_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "ZINC_USER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "ZINC_PASS", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "ZINC_INDEX_PREFIX", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SMTP_HOST", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "SMTP_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SMTP_USER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SMTP_PASS", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EnvironmentVariables.prototype, "SMTP_SECURE", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "MAIL_FROM", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EnvironmentVariables.prototype, "S3_SECONDARY_ENABLED", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_SECONDARY_ENDPOINT", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "S3_SECONDARY_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_SECONDARY_ACCESS_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_SECONDARY_SECRET_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_SECONDARY_BUCKET", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EnvironmentVariables.prototype, "S3_SECONDARY_USE_SSL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "VAPID_PUBLIC_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "VAPID_PRIVATE_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "VAPID_SUBJECT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "CORS_ORIGIN", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "RATE_LIMIT_WINDOW_MS", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "RATE_LIMIT_MAX", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "EMAIL_WORKER_CONCURRENCY", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "SEARCH_WORKER_CONCURRENCY", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "NOTIFICATION_WORKER_CONCURRENCY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_ACCESS_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_REFRESH_SECRET", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "JWT_ACCESS_TTL", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "JWT_REFRESH_TTL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "COOKIE_DOMAIN", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "ICS_FEED_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], EnvironmentVariables.prototype, "TYPEORM_LOGGING", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "TYPEORM_SLOW_QUERY_THRESHOLD_MS", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "TYPEORM_SLOW_QUERY_LOG_FILE", void 0);
function validate(config) {
    const defaults = {
        NODE_ENV: 'development',
        PORT: 4000,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'epop',
        DB_PASS: 'epop',
        DB_NAME: 'epop',
        REDIS_URL: 'redis://localhost:6379',
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: 9000,
        MINIO_ACCESS_KEY: 'minio',
        MINIO_SECRET_KEY: 'minio123',
        MINIO_BUCKET: 'epop',
        MINIO_USE_SSL: false,
        ZINC_URL: 'http://localhost:4080',
        ZINC_USER: 'admin',
        ZINC_PASS: 'admin',
        ZINC_INDEX_PREFIX: 'epop',
        SMTP_HOST: 'localhost',
        SMTP_PORT: 1025,
        SMTP_USER: '',
        SMTP_PASS: '',
        SMTP_SECURE: false,
        MAIL_FROM: 'noreply@epop.local',
        S3_SECONDARY_ENABLED: false,
        S3_SECONDARY_ENDPOINT: '',
        S3_SECONDARY_PORT: 9000,
        S3_SECONDARY_ACCESS_KEY: '',
        S3_SECONDARY_SECRET_KEY: '',
        S3_SECONDARY_BUCKET: 'epop',
        S3_SECONDARY_USE_SSL: false,
        VAPID_SUBJECT: 'mailto:admin@epop.local',
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX: 100,
        JWT_ACCESS_SECRET: 'dev_access_secret_change',
        JWT_REFRESH_SECRET: 'dev_refresh_secret_change',
        JWT_ACCESS_TTL: 900,
        JWT_REFRESH_TTL: 1209600,
        COOKIE_DOMAIN: 'localhost',
        ICS_FEED_SECRET: 'dev_ics_secret',
        EMAIL_WORKER_CONCURRENCY: 5,
        SEARCH_WORKER_CONCURRENCY: 5,
        NOTIFICATION_WORKER_CONCURRENCY: 5,
        TYPEORM_LOGGING: false,
        TYPEORM_SLOW_QUERY_THRESHOLD_MS: 200,
        TYPEORM_SLOW_QUERY_LOG_FILE: 'logs/slow-queries.log',
        ...config,
    };
    const validated = (0, class_transformer_1.plainToInstance)(EnvironmentVariables, defaults, {
        enableImplicitConversion: true,
    });
    const errors = (0, class_validator_1.validateSync)(validated, { skipMissingProperties: false });
    if (errors.length > 0) {
        throw new Error(errors.toString());
    }
    return validated;
}
//# sourceMappingURL=env.validation.js.map