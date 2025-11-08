import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan, In, type FindOptionsWhere } from 'typeorm'
import { Project } from '../entities/project.entity'
import { ProjectMember } from '../entities/project-member.entity'
import { TaskBucket } from '../entities/task-bucket.entity'
import { Task } from '../entities/task.entity'
import { TaskDependency } from '../entities/task-dependency.entity'
import { TaskComment } from '../entities/task-comment.entity'
import { TaskAssignee } from '../entities/task-assignee.entity'
import { OutboxService } from '../events/outbox.service'
import { decodeCursor, encodeCursor } from '../common/pagination/cursor'
import { User } from '../entities/user.entity'

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(ProjectMember) private readonly members: Repository<ProjectMember>,
    @InjectRepository(TaskBucket) private readonly buckets: Repository<TaskBucket>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(TaskComment) private readonly comments: Repository<TaskComment>,
    @InjectRepository(TaskAssignee) private readonly assignees: Repository<TaskAssignee>,
    @InjectRepository(TaskDependency) private readonly deps: Repository<TaskDependency>,
    private readonly outbox: OutboxService,
  ) {}

  async myProjects(userId: string) {
    const rows = await this.members.find({ where: { userId }, relations: { project: true } })
    return rows.map((r) => r.project)
  }

  async getProject(userId: string, projectId: string) {
    const member = await this.members.findOne({ where: { projectId, userId }, relations: { project: true } })
    if (!member) throw new ForbiddenException()
    return member.project
  }

  async createProject(userId: string, dto: { name: string; description?: string | null }) {
    const project = await this.projects.save(this.projects.create({ name: dto.name, description: dto.description ?? null, owner: ({ id: userId } as unknown as User) }))
    await this.members.save(this.members.create({ projectId: project.id, userId }))
    await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: project.id, userId, payload: { projectId: project.id, action: 'created' } })
    return project
  }

  async addMember(actorId: string, projectId: string, userId: string, role: string = 'member') {
    const member = await this.members.save(this.members.create({ projectId, userId, role }))
    await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: projectId, userId: actorId, payload: { projectId, action: 'member_added', userId } })
    return member
  }

  async createBucket(actorId: string, projectId: string, name: string, position: number) {
    const bucket = await this.buckets.save(this.buckets.create({ project: ({ id: projectId } as unknown as Project), name, position }))
    await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: projectId, userId: actorId, payload: { projectId, action: 'bucket_created', bucketId: bucket.id } })
    return bucket
  }

  async createTask(actorId: string, dto: { projectId: string; bucketId?: string | null; title: string; description?: string | null; position: number }) {
    const member = await this.members.findOne({ where: { projectId: dto.projectId, userId: actorId } })
    if (!member) throw new ForbiddenException()
    const task = await this.tasks.save(this.tasks.create({ project: ({ id: dto.projectId } as unknown as Project), bucket: dto.bucketId ? (({ id: dto.bucketId } as unknown) as TaskBucket) : null, title: dto.title, description: dto.description ?? null, position: dto.position, createdBy: ({ id: actorId } as unknown as User) }))
    await this.outbox.append({ name: 'project.task.created', aggregateType: 'task', aggregateId: task.id, userId: actorId, payload: { projectId: dto.projectId, bucketId: dto.bucketId ?? null, taskId: task.id } })
    return task
  }

  async moveTask(actorId: string, taskId: string, dto: { projectId: string; bucketId: string | null; position: number }) {
    const member = await this.members.findOne({ where: { projectId: dto.projectId, userId: actorId } })
    if (!member) throw new ForbiddenException()
    const task = await this.tasks.findOne({ where: { id: taskId }, relations: { project: true, bucket: true } })
    if (!task || task.project.id !== dto.projectId) throw new NotFoundException('Task not found')
    const targetBucketId = dto.bucketId ?? null
    // Shift positions in target bucket to make room
    await this.tasks.createQueryBuilder()
      .update(Task)
      .set({ position: () => 'position + 1' })
      .where('project_id = :projectId', { projectId: dto.projectId })
      .andWhere(targetBucketId === null ? 'bucket_id IS NULL' : 'bucket_id = :bucketId', { bucketId: targetBucketId ?? undefined })
      .andWhere('position >= :pos', { pos: dto.position })
      .execute()
    task.bucket = targetBucketId ? (({ id: targetBucketId } as unknown) as TaskBucket) : null
    task.position = dto.position
    await this.tasks.save(task)
    await this.outbox.append({ name: 'project.task.moved', aggregateType: 'task', aggregateId: taskId, userId: actorId, payload: { projectId: dto.projectId, bucketId: dto.bucketId, position: dto.position } })
    return { success: true }
  }

  async comment(actorId: string, taskId: string, body: string) {
    const task = await this.tasks.findOne({ where: { id: taskId }, relations: { project: true } })
    if (!task) throw new NotFoundException('Task not found')
    const member = await this.members.findOne({ where: { projectId: task.project.id, userId: actorId } })
    if (!member) throw new ForbiddenException()
    const comment = await this.comments.save(this.comments.create({ task: ({ id: taskId } as unknown as Task), user: ({ id: actorId } as unknown as User), body }))
    await this.outbox.append({ name: 'project.task.commented', aggregateType: 'task', aggregateId: taskId, userId: actorId, payload: { projectId: task.project.id, taskId, commentId: comment.id } })
    return comment
  }

  async listProjectTasksCursor(userId: string, projectId: string, limit = 20, cursor: string | null = null) {
    const member = await this.members.findOne({ where: { projectId, userId } })
    if (!member) throw new ForbiddenException()
    const where = { project: { id: projectId } } as unknown as FindOptionsWhere<Task>
    const decoded = decodeCursor(cursor)
    if (decoded?.id) where.id = LessThan(decoded.id)
    const take = Math.max(1, Math.min(100, Number(limit))) + 1
    const rows = await this.tasks.find({ where, order: { id: 'DESC' }, take, relations: { project: true } })
    const items = rows.slice(0, take - 1).reverse()
    const hasMore = rows.length === take
    const nextCursor = hasMore && items.length ? encodeCursor({ id: String(items[0]!.id) }) : undefined
    return { items, nextCursor, hasMore }
  }

  async listBuckets(userId: string, projectId: string) {
    const member = await this.members.findOne({ where: { projectId, userId } })
    if (!member) throw new ForbiddenException()
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
      .addOrderBy('t.position', 'ASC')

    const buckets = await qb.getMany()
    return buckets
  }

  async reorderBucket(userId: string, projectId: string, bucketId: string, taskIds: string[]) {
    const member = await this.members.findOne({ where: { projectId, userId } })
    if (!member) throw new ForbiddenException()
    // Ensure all tasks belong to target bucket & project
    if (taskIds && taskIds.length) {
      const tasks = await this.tasks.find({ where: ({ id: In(taskIds), project: { id: projectId }, bucket: { id: bucketId } } as unknown as FindOptionsWhere<Task>) })
      const found = new Set(tasks.map((t) => String(t.id)))
      const pairs: Array<[string, number]> = []
      let pos = 0
      for (const id of taskIds) {
        const sid = String(id)
        if (!found.has(sid)) continue
        pairs.push([sid, pos++])
      }
      if (pairs.length) {
        const valuesSql = pairs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',')
        const params = pairs.flat()
        await this.tasks.query(
          `UPDATE tasks AS t SET position = v.pos
           FROM (VALUES ${valuesSql}) AS v(id, pos)
           WHERE t.id = v.id`,
          params,
        )
      }
    }
    await this.outbox.append({ name: 'project.task.updated', aggregateType: 'project', aggregateId: projectId, userId, payload: { projectId, bucketId, action: 'reordered' } })
    return { success: true }
  }

  async listDependencies(userId: string, projectId: string, taskId?: string | null) {
    const member = await this.members.findOne({ where: { projectId, userId } })
    if (!member) throw new ForbiddenException()
    const baseWhere = ({ predecessor: { project: { id: projectId } }, successor: { project: { id: projectId } } } as unknown) as FindOptionsWhere<TaskDependency>
    const edges = await this.deps.find({
      where: taskId
        ? ([
            ({ predecessor: { id: taskId }, successor: { project: { id: projectId } } } as unknown) as FindOptionsWhere<TaskDependency>,
            ({ predecessor: { project: { id: projectId } }, successor: { id: taskId } } as unknown) as FindOptionsWhere<TaskDependency>,
          ] as FindOptionsWhere<TaskDependency>[])
        : baseWhere,
      relations: { predecessor: true, successor: true },
      order: { id: 'ASC' },
    })
    return edges.map((e) => ({ id: e.id, predecessorId: String(e.predecessor.id), successorId: String(e.successor.id), lagDays: e.lagDays }))
  }

  async addDependency(userId: string, projectId: string, predecessorId: string, successorId: string, lagDays = 0) {
    if (predecessorId === successorId) throw new ForbiddenException('Cannot depend a task on itself')
    const member = await this.members.findOne({ where: { projectId, userId } })
    if (!member) throw new ForbiddenException()
    const [pred, succ] = await Promise.all([
      this.tasks.findOne({ where: { id: predecessorId }, relations: { project: true } }),
      this.tasks.findOne({ where: { id: successorId }, relations: { project: true } }),
    ])
    if (!pred || !succ || pred.project.id !== projectId || succ.project.id !== projectId) throw new NotFoundException('Task not found')
    const exists = await this.deps.findOne({ where: (({ predecessor: { id: predecessorId }, successor: { id: successorId } } as unknown) as FindOptionsWhere<TaskDependency>) })
    if (exists) return exists
    const edge = await this.deps.save(this.deps.create({ predecessor: ({ id: predecessorId } as unknown as Task), successor: ({ id: successorId } as unknown as Task), lagDays }))
    await this.outbox.append({ name: 'project.dependency.added', aggregateType: 'project', aggregateId: projectId, userId, payload: { projectId, predecessorId, successorId, lagDays } })
    return edge
  }

  async removeDependency(userId: string, projectId: string, predecessorId: string, successorId: string) {
    const member = await this.members.findOne({ where: { projectId, userId } })
    if (!member) throw new ForbiddenException()
    const edge = await this.deps.findOne({ where: (({ predecessor: { id: predecessorId }, successor: { id: successorId } } as unknown) as FindOptionsWhere<TaskDependency>), relations: { predecessor: { project: true }, successor: { project: true } } })
    if (!edge) return { success: true }
    if (edge.predecessor.project.id !== projectId || edge.successor.project.id !== projectId) throw new ForbiddenException()
    await this.deps.delete(edge.id)
    await this.outbox.append({ name: 'project.dependency.removed', aggregateType: 'project', aggregateId: projectId, userId, payload: { projectId, predecessorId, successorId } })
    return { success: true }
  }

  async rescheduleTask(userId: string, projectId: string, taskId: string, dto: { startAt?: string | null; dueAt?: string | null; cascade?: boolean }) {
    const member = await this.members.findOne({ where: { projectId, userId } })
    if (!member) throw new ForbiddenException()
    const task = await this.tasks.findOne({ where: { id: taskId }, relations: { project: true } })
    if (!task || task.project.id !== projectId) throw new NotFoundException('Task not found')

    const oldStart = task.startAt ? new Date(task.startAt) : null
    const oldDue = task.dueAt ? new Date(task.dueAt) : null
    const hasStart = typeof dto.startAt !== 'undefined'
    const hasDue = typeof dto.dueAt !== 'undefined'
    if (hasStart) task.startAt = dto.startAt ? new Date(dto.startAt) : null
    if (hasDue) task.dueAt = dto.dueAt ? new Date(dto.dueAt) : null
    // If only start is provided and due exists, keep duration
    if (hasStart && !hasDue && oldStart && oldDue && task.startAt) {
      const len = oldDue.getTime() - oldStart.getTime()
      task.dueAt = new Date(task.startAt.getTime() + len)
    }
    await this.tasks.save(task)
    await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: taskId, userId, payload: { projectId, taskId, startAt: task.startAt, dueAt: task.dueAt } })

    // Cascade to successors: ensure successor.start >= predecessor.due + lagDays, preserve successor duration
    if (dto.cascade) {
      const queue: Array<{ id: string; due: Date | null }> = []
      queue.push({ id: String(task.id), due: task.dueAt ? new Date(task.dueAt) : null })
      const visited = new Set<string>()
      while (queue.length) {
        const cur = queue.shift()!
        if (visited.has(cur.id)) continue
        visited.add(cur.id)
        // Find successors within same project
        const edges = await this.deps.find({ where: (({ predecessor: { id: cur.id }, successor: { project: { id: projectId } } } as unknown) as FindOptionsWhere<TaskDependency>), relations: { successor: true } })
        if (!edges.length) continue
        const succIds = edges.map((e) => String(e.successor.id))
        const successors = await this.tasks.find({ where: { id: In(succIds) } })
        const succMap = new Map(successors.map((s) => [String(s.id), s]))
        for (const e of edges) {
          const succ = succMap.get(String(e.successor.id))
          if (!succ) continue
          const lagMs = Math.max(0, Number(e.lagDays || 0)) * 24 * 60 * 60 * 1000
          const predDue = cur.due
          if (!predDue) continue
          const earliestStart = new Date(predDue.getTime() + lagMs)
          if (succ.startAt && succ.dueAt) {
            const len = new Date(succ.dueAt).getTime() - new Date(succ.startAt).getTime()
            if (new Date(succ.startAt) < earliestStart) {
              succ.startAt = earliestStart
              succ.dueAt = new Date(earliestStart.getTime() + Math.max(0, len))
              await this.tasks.save(succ)
              await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: String(succ.id), userId, payload: { projectId, taskId: String(succ.id), startAt: succ.startAt, dueAt: succ.dueAt } })
              queue.push({ id: String(succ.id), due: succ.dueAt ? new Date(succ.dueAt) : null })
            }
          } else if (!succ.startAt && succ.dueAt) {
            // Align start based on due - keep previous duration as 1 day
            succ.startAt = earliestStart
            succ.dueAt = new Date(earliestStart.getTime() + 24 * 60 * 60 * 1000)
            await this.tasks.save(succ)
            await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: String(succ.id), userId, payload: { projectId, taskId: String(succ.id), startAt: succ.startAt, dueAt: succ.dueAt } })
            queue.push({ id: String(succ.id), due: succ.dueAt ? new Date(succ.dueAt) : null })
          } else {
            // If successor has no dates, set minimal window of 1 day
            succ.startAt = earliestStart
            succ.dueAt = new Date(earliestStart.getTime() + 24 * 60 * 60 * 1000)
            await this.tasks.save(succ)
            await this.outbox.append({ name: 'project.task.rescheduled', aggregateType: 'task', aggregateId: String(succ.id), userId, payload: { projectId, taskId: String(succ.id), startAt: succ.startAt, dueAt: succ.dueAt } })
            queue.push({ id: String(succ.id), due: succ.dueAt ? new Date(succ.dueAt) : null })
          }
        }
      }
    }

    return { success: true, task }
  }
}
