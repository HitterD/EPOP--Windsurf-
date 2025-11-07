# Runbook: Disaster Recovery (Kubernetes + Docker Compose)

This document outlines the end-to-end steps to recover the EPop platform from a catastrophic failure. Validate these steps in staging regularly.

## Recovery Objectives

- **RPO:** ≤ 24h (nightly DB + object backups)
- **RTO:** ≤ 2h (automated CD + scripted restore)

## 0) Preconditions

- Access to container registry (GHCR) and Kubernetes cluster
- Latest DB dump and MinIO object backup
- SMTP credentials for alert notifications (Grafana)

## 1) Bring Up Core Infrastructure

### 1.1 Kubernetes

```bash
# Ensure namespaces exist
kubectl apply -f kubernetes/monitoring/namespace.yaml

# Apply monitoring stack (Prometheus, Grafana, Loki)
kubectl apply -f kubernetes/monitoring/

# Apply ingress controller (if not present)
# (Assumed managed outside of this repo)
```

### 1.2 Application Services

```bash
# Deploy backend and frontend
kubectl apply -f kubernetes/backend-api.yaml
kubectl apply -f kubernetes/frontend.yaml
kubectl apply -f kubernetes/ingress.yaml

# Wait for rollout
kubectl rollout status deploy/epop-backend-api -n production
kubectl rollout status deploy/epop-frontend -n production
```

## 2) Restore Data

### 2.1 PostgreSQL 16

```bash
# Port-forward if DB is inside cluster
kubectl port-forward statefulset/postgres 5432:5432 -n production &

# Restore
pg_restore -c -h 127.0.0.1 -U epop -d epop /backups/postgres/epop_YYYY-MM-DD_HHMM.dump

# Run migrations
npm run migrate:run --workspace=backend
```

### 2.2 MinIO Objects

```bash
# Port-forward MinIO if needed
kubectl port-forward statefulset/minio 9000:9000 -n production &

# Restore objects using mc
mc alias set minio http://127.0.0.1:9000 <user> <pass>
mc mirror --overwrite /backups/minio/epop minio/epop
```

### 2.3 Rebuild Search Indexes

```bash
# Reindex all entities via API
BASE=https://your-domain.com/api/v1
curl -X PUT "$BASE/search/index/messages"
curl -X PUT "$BASE/search/index/tasks"
curl -X PUT "$BASE/search/index/files"
curl -X PUT "$BASE/search/index/mail_messages"
```

## 3) Validate Application Health

- **Health checks:** `GET /api/health/live`, `GET /api/health/ready`
- **Smoke tests:** Login, send chat, create/move task, file presign + attach
- **Metrics:** `GET /metrics` (Prometheus scrape)
- **Logs:** Loki/Grafana Explore for errors

## 4) Reconfigure Alerting

- Ensure Grafana SMTP is configured (see `docs/infra/alerting.md`)
- Test alert: temporarily raise threshold or use test alert rule

## 5) Post-Recovery Actions

- Rotate JWT secrets if compromised
- Review user sessions and revoke as needed (`/api/v1/auth/sessions`)
- Validate backups and set next backup schedule

## 6) Staging Drill Checklist

- [ ] K8s manifests apply successfully
- [ ] DB restored and migrations applied
- [ ] MinIO objects restored
- [ ] Search reindexed
- [ ] Smoke tests pass
- [ ] Alerts firing/resolving as expected
- [ ] Documentation updated with any deviations
