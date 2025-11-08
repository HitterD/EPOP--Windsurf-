import { FilesService } from './files.service';
import { CursorParamsDto } from '../common/dto/cursor.dto';
import { FileEntity } from '../entities/file.entity';
import type { Response } from 'express';
export declare class FilesController {
    private readonly files;
    constructor(files: FilesService);
    presign(req: any, body: {
        filename?: string;
        fileName?: string;
    }): Promise<{
        url: string;
        uploadUrl: string;
        fields: {
            [x: string]: string;
        };
        fileId: string;
        key: string;
        expiresAt: string;
    }>;
    attach(body: {
        fileId: string;
        refTable: 'messages' | 'mail_messages' | 'tasks';
        refId: string;
        filename?: string;
        mime?: string;
        size?: number;
    }): Promise<{
        success: boolean;
        linkId: string;
    }>;
    download(id: string, req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    listMineCursor(req: any, params: CursorParamsDto): Promise<{
        items: FileEntity[];
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    listMine(req: any, params: CursorParamsDto): Promise<{
        items: FileEntity[];
        nextCursor: string | undefined;
        hasMore: boolean;
    }>;
    get(id: string): Promise<FileEntity>;
    updateStatus(id: string, body: {
        status: 'pending' | 'scanning' | 'ready' | 'infected' | 'failed';
        scanResult?: string | null;
    }): Promise<{
        success: boolean;
    }>;
    confirm(id: string): Promise<FileEntity>;
    purgeTemp(olderThanHours?: number): Promise<{
        deleted: number;
    }>;
    versions(id: string): Promise<{
        key: string;
        versions: {
            versionId: string | undefined;
            size: number | undefined;
            isLatest: boolean | undefined;
            lastModified: Date | undefined;
        }[];
    }>;
    updateRetention(id: string, body: {
        policy?: string | null;
    }): Promise<{
        success: boolean;
        retentionPolicy: string | null;
        retentionExpiresAt: Date | null;
    }>;
    purgeRetention(batch?: number): Promise<{
        deleted: number;
    }>;
}
