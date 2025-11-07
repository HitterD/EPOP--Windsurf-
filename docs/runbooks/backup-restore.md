# Runbook: Backup & Restore (PostgreSQL 16, MinIO, ZincSearch)

This runbook provides end-to-end steps to back up and restore the EPop platform data. It is validated on staging.

## 1) PostgreSQL 16

### 1.1 Nightly Backup (cron)

```bash
# Custom path and retention
BACKUP_DIR=/backups/postgres
DB_HOST=postgres
DB_USER=epop
DB_NAME=epop
STAMP=$(date +%F_%H%M)
mkdir -p "$BACKUP_DIR"

# Compressed custom format (-Fc) suitable for pg_restore
pg_dump -Fc -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/${DB_NAME}_$STAMP.dump"

# Optional: keep last 14 dumps
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime +14 -delete
```

Crontab example (run at 02:30 daily):

```cron
30 2 * * * /usr/local/bin/pg_dump -Fc -h postgres -U epop epop > /backups/postgres/epop_$(date +\%F_\%H\%M).dump
```

### 1.2 Restore to Staging

```bash
RESTORE_FILE=/backups/postgres/epop_YYYY-MM-DD_HHMM.dump
DB_HOST=postgres
DB_USER=epop
DB_NAME=epop

# Drop and recreate schema (cautious: use -c)
pg_restore -c -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" "$RESTORE_FILE"

# Re-run migrations if needed
npm run migrate:run --workspace=backend
```

### 1.3 Verify

- API health: `GET /api/health/live`
- Metrics exposed: `GET /metrics` (check `process_start_time_seconds`)
- Sample query works: authenticate and list chats/projects

## 2) MinIO (S3-Compatible)

### 2.1 Backup with mc (MinIO Client)

```bash
mc alias set minio http://minio:9000 minio minio123

# Mirror bucket to backup location (local disk or remote S3-compatible)
mc mirror --overwrite --quiet minio/epop /backups/minio/epop

# Alternatively to another S3 endpoint
mc alias set backup http://backup-minio:9000 backup_user backup_pass
mc mirror --overwrite minio/epop backup/epop
```

### 2.2 Restore

```bash
# Restore all objects back to epop bucket
mc mirror --overwrite /backups/minio/epop minio/epop
```

### 2.3 Lifecycle Policies

- Ensure `uploads-temp/` has TTL ≤ 24h
- Finalized `uploads/` retain indefinitely (or per retention policy)

## 3) ZincSearch

### 3.1 Backup

- Snapshot the data directory volume (e.g., `docker/zinc-data`)

### 3.2 Reindex

```bash
# Trigger reindex via API after DB/objects restored
curl -X PUT http://localhost:4000/api/v1/search/index/messages
curl -X PUT http://localhost:4000/api/v1/search/index/tasks
curl -X PUT http://localhost:4000/api/v1/search/index/files
curl -X PUT http://localhost:4000/api/v1/search/index/mail_messages
```

## 4) Acceptance (Staging)

- [ ] API endpoints pass smoke tests: login, chat send, projects tasks, files attach
- [ ] Objects are downloadable and consistent (S3 keys resolved)
- [ ] Search returns expected results after reindex
- [ ] Metrics and dashboards render without errors
- [ ] Backups visible on storage and restore completes without errors
