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
exports.DirectoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const org_unit_entity_1 = require("../entities/org-unit.entity");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../entities/user.entity");
const directory_audit_entity_1 = require("../entities/directory-audit.entity");
const outbox_service_1 = require("../events/outbox.service");
const sync_1 = require("csv-parse/sync");
let DirectoryService = class DirectoryService {
    orgs;
    users;
    audits;
    outbox;
    constructor(orgs, users, audits, outbox) {
        this.orgs = orgs;
        this.users = users;
        this.audits = audits;
        this.outbox = outbox;
    }
    async tree() {
        const rows = await this.orgs.query(`
      WITH RECURSIVE tree AS (
        SELECT id, parent_id, name, 0 AS depth, ARRAY[id] AS path
        FROM org_units WHERE parent_id IS NULL
        UNION ALL
        SELECT o.id, o.parent_id, o.name, t.depth+1, t.path||o.id
        FROM org_units o JOIN tree t ON o.parent_id = t.id
      )
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id, 'name', name,
          'children', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object('id', c.id, 'name', c.name)
            ), '[]'::jsonb)
            FROM org_units c WHERE c.parent_id = tree.id
          )
        ) ORDER BY path
      ) AS org_tree
      FROM tree WHERE depth = 0;
    `);
        const orgTree = rows?.[0]?.org_tree ?? [];
        return { orgTree };
    }
    parseOrgCsv(buffer) {
        if (!buffer || buffer.length === 0)
            throw new common_1.BadRequestException('Missing CSV data');
        let rows = [];
        try {
            const content = buffer.toString('utf8');
            rows = (0, sync_1.parse)(content, { bom: true, columns: true, skip_empty_lines: true, trim: true });
        }
        catch {
            throw new common_1.BadRequestException('Invalid CSV');
        }
        const norm = (v) => String(v ?? '').trim();
        const toLower = (v) => norm(v).toLowerCase();
        const out = rows.map((r) => {
            const obj = {};
            for (const k of Object.keys(r))
                obj[toLower(k)] = r[k];
            return {
                code: norm(obj['code'] ?? obj['org_unit_code']),
                name: norm(obj['name'] ?? obj['org_unit_name']),
                parentCode: norm(obj['parent_code'] ?? obj['parent']),
            };
        }).filter((r) => r.code || r.name);
        return out;
    }
    async importDryRun(buffer) {
        const rows = this.parseOrgCsv(buffer);
        return { count: rows.length, preview: rows.slice(0, 50) };
    }
    async importCommit(buffer) {
        const rows = this.parseOrgCsv(buffer);
        if (!rows.length)
            return { imported: 0 };
        let imported = 0;
        await this.orgs.manager.transaction(async (manager) => {
            const orgRepo = manager.getRepository(org_unit_entity_1.OrgUnit);
            const auditRepo = manager.getRepository(directory_audit_entity_1.DirectoryAudit);
            const byCode = new Map();
            const codes = Array.from(new Set(rows.map((r) => r.code).filter(Boolean)));
            if (codes.length) {
                const existing = await orgRepo.find({ where: { code: codes } });
                for (const e of existing)
                    byCode.set(String(e.code), e);
                const toCreate = [];
                for (const r of rows) {
                    if (!r.code)
                        continue;
                    if (!byCode.has(r.code)) {
                        const entity = orgRepo.create({ code: r.code, name: r.name || r.code });
                        toCreate.push(entity);
                    }
                }
                if (toCreate.length) {
                    const created = await orgRepo.save(toCreate);
                    imported += created.length;
                    await auditRepo.save(created.map((org) => auditRepo.create({ action: 'unit_created', actorId: '0', targetId: org.id, fromParentId: null, toParentId: null, details: null })));
                    for (const c of created)
                        byCode.set(String(c.code), c);
                }
                const toUpdate = [];
                for (const r of rows) {
                    if (!r.code || !r.name)
                        continue;
                    const org = byCode.get(r.code);
                    if (org && org.name !== r.name) {
                        org.name = r.name;
                        toUpdate.push(org);
                    }
                }
                if (toUpdate.length) {
                    const updated = await orgRepo.save(toUpdate);
                    await auditRepo.save(updated.map((org) => auditRepo.create({ action: 'unit_updated', actorId: '0', targetId: org.id, fromParentId: null, toParentId: null, details: { name: org.name } })));
                    for (const u of updated)
                        byCode.set(String(u.code), u);
                }
            }
            for (const r of rows) {
                if (!r.code)
                    continue;
                const org = byCode.get(r.code);
                const fromParentId = org.parent ? org.parent.id : null;
                const parent = r.parentCode ? byCode.get(r.parentCode) : null;
                const toParentId = parent ? parent.id : null;
                const changed = (fromParentId || null) !== (toParentId || null);
                if (changed) {
                    org.parent = parent ?? null;
                    await orgRepo.save(org);
                    await auditRepo.save(auditRepo.create({ action: 'unit_moved', actorId: '0', targetId: org.id, fromParentId, toParentId, details: null }));
                }
            }
        });
        return { imported };
    }
    async create(dto) {
        const entity = this.orgs.create({ name: dto.name, code: dto.code ?? null });
        if (dto.parentId) {
            const parent = await this.orgs.findOne({ where: { id: dto.parentId } });
            if (!parent)
                throw new common_1.NotFoundException('Parent not found');
            entity.parent = parent;
        }
        return this.orgs.save(entity);
    }
    async update(id, dto) {
        const org = await this.orgs.findOne({ where: { id } });
        if (!org)
            throw new common_1.NotFoundException('Org unit not found');
        if (dto.name !== undefined)
            org.name = dto.name;
        if (dto.code !== undefined)
            org.code = dto.code;
        return this.orgs.save(org);
    }
    async remove(id) {
        const org = await this.orgs.findOne({ where: { id } });
        if (!org)
            throw new common_1.NotFoundException('Org unit not found');
        return this.orgs.remove(org);
    }
    async move(actorId, id, newParentId) {
        if (id === newParentId)
            throw new common_1.BadRequestException('Cannot move into itself');
        return this.orgs.manager.transaction(async (manager) => {
            const orgRepo = manager.getRepository(org_unit_entity_1.OrgUnit);
            const auditRepo = manager.getRepository(directory_audit_entity_1.DirectoryAudit);
            const org = await orgRepo.findOne({ where: { id }, relations: { parent: true } });
            if (!org)
                throw new common_1.NotFoundException('Org unit not found');
            const fromParentId = org.parent ? org.parent.id : null;
            let toParentId = null;
            if (newParentId) {
                const parent = await orgRepo.findOne({ where: { id: newParentId } });
                if (!parent)
                    throw new common_1.NotFoundException('Parent not found');
                org.parent = parent;
                toParentId = parent.id;
            }
            else {
                org.parent = null;
                toParentId = null;
            }
            await orgRepo.save(org);
            await auditRepo.save(auditRepo.create({
                action: 'unit_moved',
                actorId,
                targetId: id,
                fromParentId,
                toParentId,
                details: null,
            }));
            await this.outbox.appendWithManager(manager, {
                name: 'directory.unit.moved',
                aggregateType: 'org',
                aggregateId: id,
                userId: actorId,
                id: undefined,
                timestamp: undefined,
                payload: { orgId: id, fromParentId, toParentId },
            });
            return { success: true };
        });
    }
    async usersInOrg(orgId) {
        return this.users.query(`SELECT u.id, u.display_name, u.email, u.phone_ext, u.presence
       FROM users u
       JOIN org_units o ON o.id = u.org_unit_id
       WHERE o.id = $1
       ORDER BY u.display_name;`, [orgId]);
    }
    async moveUserToOrg(actorId, userId, orgId) {
        return this.users.manager.transaction(async (manager) => {
            const userRepo = manager.getRepository(user_entity_1.User);
            const orgRepo = manager.getRepository(org_unit_entity_1.OrgUnit);
            const auditRepo = manager.getRepository(directory_audit_entity_1.DirectoryAudit);
            const user = await userRepo.findOne({ where: { id: userId }, relations: { orgUnit: true } });
            if (!user)
                throw new common_1.NotFoundException('User not found');
            const org = await orgRepo.findOne({ where: { id: orgId } });
            if (!org)
                throw new common_1.NotFoundException('Org unit not found');
            const fromParentId = user.orgUnit ? user.orgUnit.id : null;
            user.orgUnit = org;
            await userRepo.save(user);
            await auditRepo.save(auditRepo.create({
                action: 'user_moved',
                actorId,
                targetId: userId,
                fromParentId,
                toParentId: org.id,
                details: null,
            }));
            await this.outbox.appendWithManager(manager, {
                name: 'directory.user.moved',
                aggregateType: 'user',
                aggregateId: userId,
                userId: actorId,
                id: undefined,
                timestamp: undefined,
                payload: { userId, fromOrgId: fromParentId, toOrgId: org.id },
            });
            return { success: true };
        });
    }
};
exports.DirectoryService = DirectoryService;
exports.DirectoryService = DirectoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(org_unit_entity_1.OrgUnit)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(directory_audit_entity_1.DirectoryAudit)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        outbox_service_1.OutboxService])
], DirectoryService);
//# sourceMappingURL=directory.service.js.map