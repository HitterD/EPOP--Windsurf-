import { OrgUnit } from '../entities/org-unit.entity';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { DirectoryAudit } from '../entities/directory-audit.entity';
import { OutboxService } from '../events/outbox.service';
export declare class DirectoryService {
    private readonly orgs;
    private readonly users;
    private readonly audits;
    private readonly outbox;
    constructor(orgs: Repository<OrgUnit>, users: Repository<User>, audits: Repository<DirectoryAudit>, outbox: OutboxService);
    tree(): Promise<{
        orgTree: any;
    }>;
    private parseOrgCsv;
    importDryRun(buffer?: Buffer): Promise<{
        count: number;
        preview: {
            code: string;
            name: string;
            parentCode: string;
        }[];
    }>;
    importCommit(buffer?: Buffer): Promise<{
        imported: number;
    }>;
    create(dto: {
        name: string;
        code?: string | null;
        parentId?: string | null;
    }): Promise<OrgUnit>;
    update(id: string, dto: {
        name?: string;
        code?: string | null;
    }): Promise<OrgUnit>;
    remove(id: string): Promise<OrgUnit>;
    move(actorId: string, id: string, newParentId: string | null): Promise<{
        success: boolean;
    }>;
    usersInOrg(orgId: string): Promise<any>;
    moveUserToOrg(actorId: string, userId: string, orgId: string): Promise<{
        success: boolean;
    }>;
}
