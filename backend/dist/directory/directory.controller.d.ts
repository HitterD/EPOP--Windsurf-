import { DirectoryService } from './directory.service';
export declare class DirectoryController {
    private readonly dir;
    constructor(dir: DirectoryService);
    tree(): Promise<{
        orgTree: any;
    }>;
    create(dto: {
        name: string;
        code?: string | null;
        parentId?: string | null;
    }): Promise<import("../entities/org-unit.entity").OrgUnit>;
    update(id: string, dto: {
        name?: string;
        code?: string | null;
    }): Promise<import("../entities/org-unit.entity").OrgUnit>;
    remove(id: string): Promise<import("../entities/org-unit.entity").OrgUnit>;
    move(req: any, id: string, parentId: string | null): Promise<{
        success: boolean;
    }>;
    users(id: string): Promise<any>;
    moveUser(req: any, userId: string, orgId: string): Promise<{
        success: boolean;
    }>;
    importDryRun(file: Express.Multer.File): Promise<{
        count: number;
        preview: {
            code: string;
            name: string;
            parentCode: string;
        }[];
    }>;
    importCommit(file: Express.Multer.File): Promise<{
        imported: number;
    }>;
}
