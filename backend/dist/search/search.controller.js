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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const search_service_1 = require("./search.service");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
const cursor_dto_1 = require("../common/dto/cursor.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let SearchController = class SearchController {
    search;
    constructor(search) {
        this.search = search;
    }
    async query(q, tab, limitStr, offsetStr, req) {
        const userId = req.user?.userId;
        const query = (q || '').toString();
        const limit = Math.max(1, Math.min(100, Number(limitStr ?? 20)));
        const offset = Math.max(0, Number(offsetStr ?? 0));
        const wrap = (hits) => hits.map((h) => ({ item: h, score: 1 }));
        if (!tab || tab === 'all') {
            const all = await this.search.searchAll(query, userId);
            const pick = (name) => (all?.results || []).find((r) => String(r.index || '').endsWith(`_${name}`))?.hits || [];
            const messages = wrap(pick('messages'));
            const files = wrap(pick('files'));
            const projects = wrap(pick('tasks'));
            const users = [];
            const total = messages.length + files.length + projects.length + users.length;
            return { messages, files, projects, users, total, took: 0 };
        }
        const mapTabToEntity = (t) => {
            if (t === 'messages')
                return 'messages';
            if (t === 'files')
                return 'files';
            if (t === 'projects')
                return 'tasks';
            return null;
        };
        const entity = mapTabToEntity(String(tab));
        if (!entity) {
            return { messages: [], files: [], projects: [], users: [], total: 0, took: 0 };
        }
        const cursor = offset > 0 ? Buffer.from(JSON.stringify({ off: offset })).toString('base64') : null;
        const page = await this.search.searchCursor(entity, query, userId, limit, cursor);
        const items = wrap(page.items || []);
        const empty = [];
        return {
            messages: entity === 'messages' ? items : empty,
            files: entity === 'files' ? items : empty,
            projects: entity === 'tasks' ? items : empty,
            users: empty,
            total: items.length,
            took: 0,
        };
    }
    async backfill(entity) {
        return this.search.backfill(entity);
    }
    async cursor(entity, q, params, req) {
        const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
        return this.search.searchCursor(entity, q || '', req.user?.userId, lim, params?.cursor || null);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('tab')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "query", null);
__decorate([
    (0, common_1.Put)('index/:entity'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Param)('entity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "backfill", null);
__decorate([
    (0, common_1.Get)(':entity/cursor'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Param)('entity')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, cursor_dto_1.CursorParamsDto, Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "cursor", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiTags)('search'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map