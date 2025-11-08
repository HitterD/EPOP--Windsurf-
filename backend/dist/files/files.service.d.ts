import { Repository } from 'typeorm';
import { FileEntity } from '../entities/file.entity';
import { FileLink } from '../entities/file-link.entity';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Queue } from 'bullmq';
export declare class FilesService {
    private readonly files;
    private readonly links;
    private readonly config;
    private readonly searchQueue;
    private readonly fileScanQueue;
    private s3;
    private bucket;
    private s3Secondary?;
    private bucketSecondary?;
    constructor(files: Repository<FileEntity>, links: Repository<FileLink>, config: ConfigService, searchQueue: Queue, fileScanQueue: Queue);
    presign(ownerId: string | null, filename: string): Promise<{
        url: string;
        uploadUrl: string;
        fields: {
            [x: string]: string;
        };
        fileId: string;
        key: string;
        expiresAt: string;
    }>;
    attach(fileId: string, dto: {
        refTable: 'messages' | 'mail_messages' | 'tasks';
        refId: string;
        filename?: string;
        mime?: string;
        size?: number;
    }): Promise<{
        success: boolean;
        linkId: string;
    }>;
    get(id: string): Promise<FileEntity>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
    listMineCursor(userId: string, limit?: number, cursor?: string | null): Promise<{
        items: FileEntity[];
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    updateStatus(id: string, status: 'pending' | 'scanning' | 'ready' | 'infected' | 'failed', scanResult: string | null): Promise<{
        success: boolean;
    }>;
    downloadToResponse(id: string, userId: string | null, res: Response): Promise<Response<any, Record<string, any>>>;
    confirm(id: string): Promise<FileEntity>;
    purgeTemp(olderThanHours: number): Promise<{
        deleted: number;
    }>;
    listVersions(id: string): Promise<{
        key: string;
        versions: {
            versionId: string | undefined;
            size: number | undefined;
            isLatest: boolean | undefined;
            lastModified: Date | undefined;
        }[];
    }>;
    updateRetention(id: string, policy: string | null): Promise<{
        success: boolean;
        retentionPolicy: string | null;
        retentionExpiresAt: Date | null;
    }>;
    purgeRetentionExpired(batch?: number): Promise<{
        deleted: number;
    }>;
    private replicateToSecondary;
}
