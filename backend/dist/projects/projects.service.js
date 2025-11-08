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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_entity_1 = require("../entities/project.entity");
const project_member_entity_1 = require("../entities/project-member.entity");
const task_bucket_entity_1 = require("../entities/task-bucket.entity");
const task_entity_1 = require("../entities/task.entity");
const task_dependency_entity_1 = require("../entities/task-dependency.entity");
const task_comment_entity_1 = require("../entities/task-comment.entity");
const task_assignee_entity_1 = require("../entities/task-assignee.entity");
const outbox_service_1 = require("../events/outbox.service");
const cursor_1 = require("../common/pagination/cursor");
let ProjectsService = class ProjectsService {
    projects;
    members;
    buckets;
    tasks;
    comments;
    assignees;
    deps;
    outbox;
    constructor(projects, members, buckets, tasks, comments, assignees, deps, outbox) {
        this.projects = projects;
        this.members = members;
        this.buckets = buckets;
        this.tasks = tasks;
        this.comments = comments;
        this.assignees = assignees;
        this.deps = deps;
        this.outbox = outbox;
    }
    async myProjects(userId) {
        const rows = await this.members.find({ where: { userId }, relations: { project: true } });
        return rows.map((r) => r.project);
    }
    async getProject(userId, projectId) {
        const member = await this.members.findOne({ where: { projectId, userId }, relations: { project: true } });
        if (!member)
            throw new common_1.ForbiddenException();
        return member.project;
    }
    async createProject(userId, dto) {
        const project = await this.projects.save(this.projects.create({ name: dto.name, description: dto.description ?? null, owner: { id: userId } }));
        await this.members.save(this.members.create({ projectId: project.id, userId }));
        await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: project.id, userId, payload: { projectId: project.id, action: 'created' } });
        return project;
    }
    async addMember(actorId, projectId, userId, role = 'member') {
        const member = await this.members.save(this.members.create({ projectId, userId, role }));
        await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: projectId, userId: actorId, payload: { projectId, action: 'member_added', userId } });
        return member;
    }
    async createBucket(actorId, projectId, name, position) {
        const bucket = await this.buckets.save(this.buckets.create({ project: { id: projectId }, name, position }));
        await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: projectId, userId: actorId, payload: { projectId, action: 'bucket_created', bucketId: bucket.id } });
        return bucket;
    }
    async createTask(actorId, dto) {
        const member = await this.members.findOne({ where: { projectId: dto.projectId, userId: actorId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const task = await this.tasks.save(this.tasks.create({ project: { id: dto.projectId }, bucket: dto.bucketId ? { id: dto.bucketId } : null, title: dto.title, description: dto.description ?? null, position: dto.position, createdBy: { id: actorId } }));
        await this.outbox.append({ name: 'project.task.created', aggregateType: 'task', aggregateId: task.id, userId: actorId, payload: { projectId: dto.projectId, bucketId: dto.bucketId ?? null, taskId: task.id } });
        return task;
    }
    async moveTask(actorId, taskId, dto) {
        const member = await this.members.findOne({ where: { projectId: dto.projectId, userId: actorId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const task = await this.tasks.findOne({ where: { id: taskId }, relations: { project: true, bucket: true } });
        if (!task || task.project.id !== dto.projectId)
            throw new common_1.NotFoundException('Task not found');
        const targetBucketId = dto.bucketId ?? null;
        await this.tasks.createQueryBuilder()
            .update(task_entity_1.Task)
            .set({ position: () => 'position + 1' })
            .where('project_id = :projectId', { projectId: dto.projectId })
            .andWhere(targetBucketId === null ? 'bucket_id IS NULL' : 'bucket_id = :bucketId', { bucketId: targetBucketId ?? undefined })
            .andWhere('position >= :pos', { pos: dto.position })
            .execute();
        task.bucket = targetBucketId ? { id: targetBucketId } : null;
        task.position = dto.position;
        await this.tasks.save(task);
        await this.outbox.append({ name: 'project.task.moved', aggregateType: 'task', aggregateId: taskId, userId: actorId, payload: { projectId: dto.projectId, bucketId: dto.bucketId, position: dto.position } });
        return { success: true };
    }
    async comment(actorId, taskId, body) {
        const task = await this.tasks.findOne({ where: { id: taskId }, relations: { project: true } });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        const member = await this.members.findOne({ where: { projectId: task.project.id, userId: actorId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const comment = await this.comments.save(this.comments.create({ task: { id: taskId }, user: { id: actorId }, body }));
        await this.outbox.append({ name: 'project.task.commented', aggregateType: 'task', aggregateId: taskId, userId: actorId, payload: { projectId: task.project.id, taskId, commentId: comment.id } });
        return comment;
    }
    async listProjectTasksCursor(userId, projectId, limit = 20, cursor = null) {
        const member = await this.members.findOne({ where: { projectId, userId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const where = { project: { id: projectId } };
        const decoded = (0, cursor_1.decodeCursor)(cursor);
        if (decoded?.id)
            where.id = (0, typeorm_2.LessThan)(decoded.id);
        const take = Math.max(1, Math.min(100, Number(limit))) + 1;
        const rows = await this.tasks.find({ where, order: { id: 'DESC' }, take, relations: { project: true } });
        const items = rows.slice(0, take - 1).reverse();
        const hasMore = rows.length === take;
        const nextCursor = hasMore && items.length ? (0, cursor_1.encodeCursor)({ id: String(items[0].id) }) : undefined;
        return { items, nextCursor, hasMore };
    }
    async listBuckets(userId, projectId) {
        const member = await this.members.findOne({ where: { projectId, userId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const qb = this.buckets
            .createQueryBuilder('b')
            .leftJoin('b.project', 'p')
            .leftJoin('b.tasks', 't')
            .select([
            'b.id',
            'b.name',
            'b.position',
            't.id',
            't.title',
            't.position',
            't.startAt',
            't.dueAt',
            't.progress',
        ])
            .where('p.id = :projectId', { projectId })
            .orderBy('b.position', 'ASC')
            .addOrderBy('t.position', 'ASC');
        const buckets = await qb.getMany();
        return buckets;
    }
    async reorderBucket(userId, projectId, bucketId, taskIds) {
        const member = await this.members.findOne({ where: { projectId, userId } });
        if (!member)
            throw new common_1.ForbiddenException();
        if (taskIds && taskIds.length) {
            const tasks = await this.tasks.find({ where: { id: (0, typeorm_2.In)(taskIds), project: { id: projectId }, bucket: { id: bucketId } } });
            const found = new Set(tasks.map((t) => String(t.id)));
            const pairs = [];
            let pos = 0;
            for (const id of taskIds) {
                const sid = String(id);
                if (!found.has(sid))
                    continue;
                pairs.push([sid, pos++]);
            }
            if (pairs.length) {
                const valuesSql = pairs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
                const params = pairs.flat();
                await this.tasks.query(`UPDATE tasks AS t SET position = v.pos
           FROM (VALUES ${valuesSql}) AS v(id, pos)
           WHERE t.id = v.id`, params);
            }
        }
        await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: projectId, userId, payload: { projectId, bucketId, action: 'reordered' } });
        return { success: true };
    }
    async listDependencies(userId, projectId, taskId) {
        const member = await this.members.findOne({ where: { projectId, userId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const where = {
            predecessor: { project: { id: projectId } },
            successor: { project: { id: projectId } },
        };
        if (taskId) {
            where["predecessor"] = [{ project: { id: projectId }, id: taskId }, { project: { id: projectId } }];
        }
        const edges = await this.deps.find({
            where: taskId
                ? [
                    { predecessor: { id: taskId }, successor: { project: { id: projectId } } },
                    { predecessor: { project: { id: projectId } }, successor: { id: taskId } },
                ]
                : where,
            relations: { predecessor: true, successor: true },
            order: { id: 'ASC' },
        });
        return edges.map((e) => ({ id: e.id, predecessorId: String(e.predecessor.id), successorId: String(e.successor.id), lagDays: e.lagDays }));
    }
    async addDependency(userId, projectId, predecessorId, successorId, lagDays = 0) {
        if (predecessorId === successorId)
            throw new common_1.ForbiddenException('Cannot depend a task on itself');
        const member = await this.members.findOne({ where: { projectId, userId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const [pred, succ] = await Promise.all([
            this.tasks.findOne({ where: { id: predecessorId }, relations: { project: true } }),
            this.tasks.findOne({ where: { id: successorId }, relations: { project: true } }),
        ]);
        if (!pred || !succ || pred.project.id !== projectId || succ.project.id !== projectId)
            throw new common_1.NotFoundException('Task not found');
        const exists = await this.deps.findOne({ where: { predecessor: { id: predecessorId }, successor: { id: successorId } } });
        if (exists)
            return exists;
        const edge = await this.deps.save(this.deps.create({ predecessor: { id: predecessorId }, successor: { id: successorId }, lagDays }));
        await this.outbox.append({ name: 'project.dependency.added', aggregateType: 'project', aggregateId: projectId, userId, payload: { projectId, predecessorId, successorId, lagDays } });
        return edge;
    }
    async removeDependency(userId, projectId, predecessorId, successorId) {
        const member = await this.members.findOne({ where: { projectId, userId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const edge = await this.deps.findOne({ where: { predecessor: { id: predecessorId }, successor: { id: successorId } }, relations: { predecessor: { project: true }, successor: { project: true } } });
        if (!edge)
            return { success: true };
        if (edge.predecessor.project.id !== projectId || edge.successor.project.id !== projectId)
            throw new common_1.ForbiddenException();
        await this.deps.delete(edge.id);
        await this.outbox.append({ name: 'project.dependency.removed', aggregateType: 'project', aggregateId: projectId, userId, payload: { projectId, predecessorId, successorId } });
        return { success: true };
    }
    async rescheduleTask(userId, projectId, taskId, dto) {
        const member = await this.members.findOne({ where: { projectId, userId } });
        if (!member)
            throw new common_1.ForbiddenException();
        const task = await this.tasks.findOne({ where: { id: taskId }, relations: { project: true } });
        if (!task || task.project.id !== projectId)
            throw new common_1.NotFoundException('Task not found');
        const oldStart = task.startAt ? new Date(task.startAt) : null;
        const oldDue = task.dueAt ? new Date(task.dueAt) : null;
        const hasStart = typeof dto.startAt !== 'undefined';
        const hasDue = typeof dto.dueAt !== 'undefined';
        if (hasStart)
            task.startAt = dto.startAt ? new Date(dto.startAt) : null;
        if (hasDue)
            task.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
        if (hasStart && !hasDue && oldStart && oldDue && task.startAt) {
            const len = oldDue.getTime() - oldStart.getTime();
            task.dueAt = new Date(task.startAt.getTime() + len);
        }
        await this.tasks.save(task);
        await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: taskId, userId, payload: { projectId, taskId, startAt: task.startAt, dueAt: task.dueAt } });
        if (dto.cascade) {
            const queue = [];
            queue.push({ id: String(task.id), due: task.dueAt ? new Date(task.dueAt) : null });
            const visited = new Set();
            while (queue.length) {
                const cur = queue.shift();
                if (visited.has(cur.id))
                    continue;
                visited.add(cur.id);
                const edges = await this.deps.find({ where: { predecessor: { id: cur.id }, successor: { project: { id: projectId } } }, relations: { successor: true } });
                if (!edges.length)
                    continue;
                const succIds = edges.map((e) => String(e.successor.id));
                const successors = await this.tasks.find({ where: { id: (0, typeorm_2.In)(succIds) } });
                const succMap = new Map(successors.map((s) => [String(s.id), s]));
                for (const e of edges) {
                    const succ = succMap.get(String(e.successor.id));
                    if (!succ)
                        continue;
                    const lagMs = Math.max(0, Number(e.lagDays || 0)) * 24 * 60 * 60 * 1000;
                    const predDue = cur.due;
                    if (!predDue)
                        continue;
                    const earliestStart = new Date(predDue.getTime() + lagMs);
                    if (succ.startAt && succ.dueAt) {
                        const len = new Date(succ.dueAt).getTime() - new Date(succ.startAt).getTime();
                        if (new Date(succ.startAt) < earliestStart) {
                            succ.startAt = earliestStart;
                            succ.dueAt = new Date(earliestStart.getTime() + Math.max(0, len));
                            await this.tasks.save(succ);
                            await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: String(succ.id), userId, payload: { projectId, taskId: String(succ.id), startAt: succ.startAt, dueAt: succ.dueAt } });
                            queue.push({ id: String(succ.id), due: succ.dueAt ? new Date(succ.dueAt) : null });
                        }
                    }
                    else if (!succ.startAt && succ.dueAt) {
                        succ.startAt = earliestStart;
                        succ.dueAt = new Date(earliestStart.getTime() + 24 * 60 * 60 * 1000);
                        await this.tasks.save(succ);
                        await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: String(succ.id), userId, payload: { projectId, taskId: String(succ.id), startAt: succ.startAt, dueAt: succ.dueAt } });
                        queue.push({ id: String(succ.id), due: succ.dueAt ? new Date(succ.dueAt) : null });
                    }
                    else {
                        succ.startAt = earliestStart;
                        succ.dueAt = new Date(earliestStart.getTime() + 24 * 60 * 60 * 1000);
                        await this.tasks.save(succ);
                        await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: String(succ.id), userId, payload: { projectId, taskId: String(succ.id), startAt: succ.startAt, dueAt: succ.dueAt } });
                        queue.push({ id: String(succ.id), due: succ.dueAt ? new Date(succ.dueAt) : null });
                    }
                }
            }
        }
        return { success: true, task };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(project_member_entity_1.ProjectMember)),
    __param(2, (0, typeorm_1.InjectRepository)(task_bucket_entity_1.TaskBucket)),
    __param(3, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(4, (0, typeorm_1.InjectRepository)(task_comment_entity_1.TaskComment)),
    __param(5, (0, typeorm_1.InjectRepository)(task_assignee_entity_1.TaskAssignee)),
    __param(6, (0, typeorm_1.InjectRepository)(task_dependency_entity_1.TaskDependency)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        outbox_service_1.OutboxService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map