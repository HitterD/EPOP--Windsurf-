import { Project } from './project.entity';
import { TaskBucket } from './task-bucket.entity';
import { User } from './user.entity';
import { TaskAssignee } from './task-assignee.entity';
import { TaskComment } from './task-comment.entity';
export declare class Task {
    id: string;
    project: Project;
    bucket: TaskBucket | null;
    title: string;
    description: string | null;
    priority: 'low' | 'medium' | 'high' | string;
    progress: 'not_started' | 'in_progress' | 'completed' | 'late' | string;
    startAt: Date | null;
    dueAt: Date | null;
    position: number;
    createdBy: User | null;
    createdAt: Date;
    assignees: TaskAssignee[];
    comments: TaskComment[];
}
