import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { MailMessage } from '../entities/mail-message.entity';
import { FileEntity } from '../entities/file.entity';
import { Task } from '../entities/task.entity';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class SearchService {
    private readonly messages;
    private readonly mails;
    private readonly files;
    private readonly tasks;
    private readonly config;
    private readonly queue;
    private readonly logger;
    private client;
    private prefix;
    private searchRequests;
    private searchDuration;
    private indexLag;
    constructor(messages: Repository<Message>, mails: Repository<MailMessage>, files: Repository<FileEntity>, tasks: Repository<Task>, config: ConfigService, queue: Queue);
    enqueueBackfill(entity: 'messages' | 'mail_messages' | 'files' | 'tasks'): Promise<{
        enqueued: boolean;
    }>;
    searchCursor(entity: 'messages' | 'mail_messages' | 'files' | 'tasks', q: string, userId: string | undefined, limit?: number, cursor?: string | null): Promise<{
        items: any[];
        nextCursor: string | undefined;
        hasMore: boolean;
    } | {
        items: never[];
        hasMore: boolean;
    }>;
    private idx;
    searchAll(q: string, userId?: string): Promise<{
        results: any[];
    }>;
    private extractId;
    private filterAccessible;
    backfill(entity: 'messages' | 'mail_messages' | 'files' | 'tasks'): Promise<{
        success: boolean;
    }>;
    indexDoc(index: string, id: string, body: any): Promise<boolean>;
    deleteDoc(index: string, id: string): Promise<boolean>;
}
