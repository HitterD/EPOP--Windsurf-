"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const project_entity_1 = require("../entities/project.entity");
const project_member_entity_1 = require("../entities/project-member.entity");
const task_bucket_entity_1 = require("../entities/task-bucket.entity");
const task_entity_1 = require("../entities/task.entity");
const task_assignee_entity_1 = require("../entities/task-assignee.entity");
const task_dependency_entity_1 = require("../entities/task-dependency.entity");
const task_comment_entity_1 = require("../entities/task-comment.entity");
const projects_service_1 = require("./projects.service");
const projects_controller_1 = require("./projects.controller");
const events_module_1 = require("../events/events.module");
const project_member_guard_1 = require("../common/guards/project-member.guard");
let ProjectsModule = class ProjectsModule {
};
exports.ProjectsModule = ProjectsModule;
exports.ProjectsModule = ProjectsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([project_entity_1.Project, project_member_entity_1.ProjectMember, task_bucket_entity_1.TaskBucket, task_entity_1.Task, task_assignee_entity_1.TaskAssignee, task_comment_entity_1.TaskComment, task_dependency_entity_1.TaskDependency]),
            events_module_1.EventsModule,
        ],
        providers: [projects_service_1.ProjectsService, project_member_guard_1.ProjectMemberGuard],
        controllers: [projects_controller_1.ProjectsController],
        exports: [projects_service_1.ProjectsService],
    })
], ProjectsModule);
//# sourceMappingURL=projects.module.js.map