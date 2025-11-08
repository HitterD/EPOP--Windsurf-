import { ProjectsService } from './projects.service';
import { CursorParamsDto } from '../common/dto/cursor.dto';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';
import { AddDependencyDto, AddMemberDto, CreateBucketDto, CreateProjectDto, CreateTaskDto, MoveTaskDto, ReorderTasksDto, RescheduleTaskDto } from './dto/requests.dto';
export declare class ProjectsController {
    private readonly projects;
    constructor(projects: ProjectsService);
    mine(req: any): Promise<Project[]>;
    create(req: any, body: CreateProjectDto): Promise<Project>;
    addMember(req: any, projectId: string, body: AddMemberDto): Promise<import("../entities/project-member.entity").ProjectMember>;
    createBucket(req: any, projectId: string, body: CreateBucketDto): Promise<import("../entities/task-bucket.entity").TaskBucket>;
    createTask(req: any, projectId: string, body: CreateTaskDto): Promise<Task>;
    listTasksCursor(req: any, projectId: string, params: CursorParamsDto): Promise<{
        items: Task[];
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    listTasks(req: any, projectId: string, params: CursorParamsDto): Promise<{
        items: Task[];
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    moveTask(req: any, projectId: string, taskId: string, body: MoveTaskDto): Promise<{
        success: boolean;
    }>;
    moveTaskPatch(req: any, projectId: string, taskId: string, body: MoveTaskDto): Promise<{
        success: boolean;
    }>;
    comment(req: any, projectId: string, taskId: string, text: string): Promise<import("../entities/task-comment.entity").TaskComment>;
    listBuckets(req: any, projectId: string): Promise<import("../entities/task-bucket.entity").TaskBucket[]>;
    reorder(req: any, projectId: string, bucketId: string, dto: ReorderTasksDto): Promise<{
        success: boolean;
    }>;
    listDependencies(req: any, projectId: string, taskId?: string): Promise<{
        id: string;
        predecessorId: string;
        successorId: string;
        lagDays: number;
    }[]>;
    listTaskDependencies(req: any, projectId: string, taskId: string): Promise<{
        id: string;
        predecessorId: string;
        successorId: string;
        lagDays: number;
    }[]>;
    addDependency(req: any, projectId: string, body: AddDependencyDto): Promise<import("../entities/task-dependency.entity").TaskDependency>;
    removeDependency(req: any, projectId: string, predecessorId: string, successorId: string): Promise<{
        success: boolean;
    }>;
    reschedule(req: any, projectId: string, taskId: string, body: RescheduleTaskDto): Promise<{
        success: boolean;
        task: Task;
    }>;
}
