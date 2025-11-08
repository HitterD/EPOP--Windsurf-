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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const projects_service_1 = require("./projects.service");
const swagger_1 = require("@nestjs/swagger");
const error_dto_1 = require("../common/dto/error.dto");
const cursor_dto_1 = require("../common/dto/cursor.dto");
const project_member_decorator_1 = require("../common/decorators/project-member.decorator");
const project_member_guard_1 = require("../common/guards/project-member.guard");
const project_entity_1 = require("../entities/project.entity");
const task_entity_1 = require("../entities/task.entity");
const cursor_response_dto_1 = require("../common/dto/cursor-response.dto");
const requests_dto_1 = require("./dto/requests.dto");
let ProjectsController = class ProjectsController {
    projects;
    constructor(projects) {
        this.projects = projects;
    }
    async mine(req) {
        return this.projects.myProjects(req.user.userId);
    }
    async create(req, body) {
        return this.projects.createProject(req.user.userId, body);
    }
    async addMember(req, projectId, body) {
        return this.projects.addMember(req.user.userId, projectId, body.userId, body.role ?? 'member');
    }
    async createBucket(req, projectId, body) {
        return this.projects.createBucket(req.user.userId, projectId, body.name, body.position);
    }
    async createTask(req, projectId, body) {
        return this.projects.createTask(req.user.userId, { projectId, bucketId: body.bucketId ?? null, title: body.title, description: body.description ?? null, position: body.position });
    }
    async listTasksCursor(req, projectId, params) {
        const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
        return this.projects.listProjectTasksCursor(req.user.userId, projectId, lim, params?.cursor || null);
    }
    async listTasks(req, projectId, params) {
        const lim = Math.max(1, Math.min(100, Number(params?.limit ?? 20)));
        return this.projects.listProjectTasksCursor(req.user.userId, projectId, lim, params?.cursor || null);
    }
    async moveTask(req, projectId, taskId, body) {
        const pos = body.position ?? body.orderIndex ?? 0;
        return this.projects.moveTask(req.user.userId, taskId, { projectId, bucketId: body.bucketId ?? null, position: pos });
    }
    async moveTaskPatch(req, projectId, taskId, body) {
        const pos = body.position ?? body.orderIndex ?? 0;
        return this.projects.moveTask(req.user.userId, taskId, { projectId, bucketId: body.bucketId ?? null, position: pos });
    }
    async comment(req, projectId, taskId, text) {
        return this.projects.comment(req.user.userId, taskId, text);
    }
    async listBuckets(req, projectId) {
        return this.projects.listBuckets(req.user.userId, projectId);
    }
    async reorder(req, projectId, bucketId, dto) {
        return this.projects.reorderBucket(req.user.userId, projectId, bucketId, dto.taskIds || []);
    }
    async listDependencies(req, projectId, taskId) {
        return this.projects.listDependencies(req.user.userId, projectId, taskId || null);
    }
    async listTaskDependencies(req, projectId, taskId) {
        return this.projects.listDependencies(req.user.userId, projectId, taskId);
    }
    async addDependency(req, projectId, body) {
        const lag = typeof body.lagDays === 'number' ? body.lagDays : 0;
        return this.projects.addDependency(req.user.userId, projectId, body.predecessorId, body.successorId, lag);
    }
    async removeDependency(req, projectId, predecessorId, successorId) {
        return this.projects.removeDependency(req.user.userId, projectId, predecessorId, successorId);
    }
    async reschedule(req, projectId, taskId, body) {
        return this.projects.rescheduleTask(req.user.userId, projectId, taskId, body);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)('mine'),
    (0, swagger_1.ApiOkResponse)({ type: project_entity_1.Project, isArray: true }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOkResponse)({ type: project_entity_1.Project }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_dto_1.CreateProjectDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':projectId/members'),
    (0, common_1.UseGuards)(project_member_guard_1.ProjectMemberGuard),
    (0, project_member_decorator_1.ProjectMember)(),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, requests_dto_1.AddMemberDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "addMember", null);
__decorate([
    (0, common_1.Post)(':projectId/buckets'),
    (0, common_1.UseGuards)(project_member_guard_1.ProjectMemberGuard),
    (0, project_member_decorator_1.ProjectMember)(),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, requests_dto_1.CreateBucketDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "createBucket", null);
__decorate([
    (0, common_1.Post)(':projectId/tasks'),
    (0, common_1.UseGuards)(project_member_guard_1.ProjectMemberGuard),
    (0, project_member_decorator_1.ProjectMember)(),
    (0, swagger_1.ApiOkResponse)({ type: task_entity_1.Task }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, requests_dto_1.CreateTaskDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "createTask", null);
__decorate([
    (0, common_1.Get)(':projectId/tasks/cursor'),
    (0, swagger_1.ApiOkResponse)({ type: cursor_response_dto_1.CursorTasksResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cursor_dto_1.CursorParamsDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listTasksCursor", null);
__decorate([
    (0, common_1.Get)(':projectId/tasks'),
    (0, swagger_1.ApiOkResponse)({ type: cursor_response_dto_1.CursorTasksResponse }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cursor_dto_1.CursorParamsDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listTasks", null);
__decorate([
    (0, common_1.Post)(':projectId/tasks/:taskId/move'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, requests_dto_1.MoveTaskDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "moveTask", null);
__decorate([
    (0, common_1.Patch)(':projectId/tasks/:taskId/move'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, requests_dto_1.MoveTaskDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "moveTaskPatch", null);
__decorate([
    (0, common_1.Post)(':projectId/tasks/:taskId/comments'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, common_1.Body)('body')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "comment", null);
__decorate([
    (0, common_1.Get)(':projectId/buckets'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listBuckets", null);
__decorate([
    (0, common_1.Post)(':projectId/buckets/:bucketId/reorder'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('bucketId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, requests_dto_1.ReorderTasksDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "reorder", null);
__decorate([
    (0, common_1.Get)(':projectId/dependencies'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Query)('taskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listDependencies", null);
__decorate([
    (0, common_1.Get)(':projectId/tasks/:taskId/dependencies'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('taskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "listTaskDependencies", null);
__decorate([
    (0, common_1.Post)(':projectId/dependencies'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, requests_dto_1.AddDependencyDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "addDependency", null);
__decorate([
    (0, common_1.Delete)(':projectId/dependencies/:predecessorId/:successorId'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('predecessorId')),
    __param(3, (0, common_1.Param)('successorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "removeDependency", null);
__decorate([
    (0, common_1.Post)(':projectId/tasks/:taskId/reschedule'),
    (0, swagger_1.ApiOkResponse)({ type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, requests_dto_1.RescheduleTaskDto]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "reschedule", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiTags)('projects'),
    (0, swagger_1.ApiDefaultResponse)({ type: error_dto_1.ErrorResponse }),
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map