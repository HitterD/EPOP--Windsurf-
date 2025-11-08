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
exports.Task = void 0;
const typeorm_1 = require("typeorm");
const project_entity_1 = require("./project.entity");
const task_bucket_entity_1 = require("./task-bucket.entity");
const user_entity_1 = require("./user.entity");
const task_assignee_entity_1 = require("./task-assignee.entity");
const task_comment_entity_1 = require("./task-comment.entity");
let Task = class Task {
    id;
    project;
    bucket;
    title;
    description;
    priority;
    progress;
    startAt;
    dueAt;
    position;
    createdBy;
    createdAt;
    assignees;
    comments;
};
exports.Task = Task;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment', { type: 'bigint' }),
    __metadata("design:type", String)
], Task.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (p) => p.tasks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], Task.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => task_bucket_entity_1.TaskBucket, (b) => b.tasks, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'bucket_id' }),
    __metadata("design:type", Object)
], Task.prototype, "bucket", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Task.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", Object)
], Task.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { default: 'medium' }),
    __metadata("design:type", String)
], Task.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { default: 'not_started' }),
    __metadata("design:type", String)
], Task.prototype, "progress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Task.prototype, "startAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Task.prototype, "dueAt", void 0);
__decorate([
    (0, typeorm_1.Column)('int'),
    __metadata("design:type", Number)
], Task.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", Object)
], Task.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz', default: () => 'now()' }),
    __metadata("design:type", Date)
], Task.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => task_assignee_entity_1.TaskAssignee, (a) => a.task),
    __metadata("design:type", Array)
], Task.prototype, "assignees", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => task_comment_entity_1.TaskComment, (c) => c.task),
    __metadata("design:type", Array)
], Task.prototype, "comments", void 0);
exports.Task = Task = __decorate([
    (0, typeorm_1.Entity)({ name: 'tasks' })
], Task);
//# sourceMappingURL=task.entity.js.map