import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { TaskBucket } from '../entities/task-bucket.entity';
import { Task } from '../entities/task.entity';
import { TaskDependency } from '../entities/task-dependency.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskAssignee } from '../entities/task-assignee.entity';
import { OutboxService } from '../events/outbox.service';
export declare class ProjectsService {
    private readonly projects;
    private readonly members;
    private readonly buckets;
    private readonly tasks;
    private readonly comments;
    private readonly assignees;
    private readonly deps;
    private readonly outbox;
    constructor(projects: Repository<Project>, members: Repository<ProjectMember>, buckets: Repository<TaskBucket>, tasks: Repository<Task>, comments: Repository<TaskComment>, assignees: Repository<TaskAssignee>, deps: Repository<TaskDependency>, outbox: OutboxService);
    myProjects(userId: string): Promise<Project[]>;
    getProject(userId: string, projectId: string): Promise<Project>;
    createProject(userId: string, dto: {
        name: string;
        description?: string | null;
    }): Promise<Project>;
    addMember(actorId: string, projectId: string, userId: string, role?: string): Promise<ProjectMember>;
    createBucket(actorId: string, projectId: string, name: string, position: number): Promise<TaskBucket>;
    createTask(actorId: string, dto: {
        projectId: string;
        bucketId?: string | null;
        title: string;
        description?: string | null;
        position: number;
    }): Promise<Task>;
    moveTask(actorId: string, taskId: string, dto: {
        projectId: string;
        bucketId: string | null;
        position: number;
    }): Promise<{
        success: boolean;
    }>;
    comment(actorId: string, taskId: string, body: string): Promise<TaskComment>;
    listProjectTasksCursor(userId: string, projectId: string, limit?: number, cursor?: string | null): Promise<{
        items: Task[];
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    listBuckets(userId: string, projectId: string): Promise<TaskBucket[]>;
    reorderBucket(userId: string, projectId: string, bucketId: string, taskIds: string[]): Promise<{
        success: boolean;
    }>;
    listDependencies(userId: string, projectId: string, taskId?: string | null): Promise<{
        id: string;
        predecessorId: string;
        successorId: string;
        lagDays: number;
    }[]>;
    addDependency(userId: string, projectId: string, predecessorId: string, successorId: string, lagDays?: number): Promise<TaskDependency>;
    removeDependency(userId: string, projectId: string, predecessorId: string, successorId: string): Promise<{
        success: boolean;
    }>;
    rescheduleTask(userId: string, projectId: string, taskId: string, dto: {
        startAt?: string | null;
        dueAt?: string | null;
        cascade?: boolean;
    }): Promise<{
        success: boolean;
        task: Task;
    }>;
}
