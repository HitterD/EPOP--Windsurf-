# Backend Scalability Plan (PostgreSQL Read-Replica, PgBouncer)

This document describes patterns to scale the EPop backend for higher throughput and reliability.

## 1) Database Read-Replica

### Strategy
- Use PostgreSQL streaming replication (physical) for one or more read-only replicas.
- Application routes read queries to replicas and writes to primary.
- Promote replica during failover using orchestrator tooling (e.g., Patroni, Cloud provider, or manual).

### App Layer
- TypeORM supports multiple connections; configure `replication` in DataSource options:

```ts
export const dataSource = new DataSource({
  type: 'postgres',
  replication: {
    master: { host: process.env.DB_HOST!, port: +process.env.DB_PORT!, username: process.env.DB_USER!, password: process.env.DB_PASS!, database: process.env.DB_NAME! },
    slaves: [
      { host: process.env.DB_REPLICA1_HOST!, port: +process.env.DB_REPLICA1_PORT!, username: process.env.DB_USER!, password: process.env.DB_PASS!, database: process.env.DB_NAME! },
    ],
  },
  // ...
})
```

- Alternatively, maintain two separate pools: `writePool` and `readPool`. Route read-intensive services (search metadata, lists) to `readPool`.

### Readiness & Health
- Primary readiness: `SELECT 1` and `pg_is_in_recovery() = false`
- Replica readiness: `SELECT 1` and `pg_is_in_recovery() = true`
- Liveness: `pg_stat_activity` basic query

## 2) Connection Pooling (PgBouncer)

### Why PgBouncer
- Reduces connection overhead with many API/worker pods.
- Prevents exhausting `max_connections` on PostgreSQL.

### Mode
- Use `transaction` pooling for OLTP API workloads.

### Deployment
- Run PgBouncer as a sidecar, daemonset, or separate service.
- Configure environment variables:
  - `PGBOUNCER_HOST`, `PGBOUNCER_PORT`
  - `DB_POOL_MIN`, `DB_POOL_MAX`

### App Config
- Set TypeORM pool sizing:
  - `DB_POOL_MIN=10`
  - `DB_POOL_MAX=50`
  - Timeouts: `statement_timeout`, `idle_in_transaction_session_timeout`

## 3) Query Performance
- Use `EXPLAIN (ANALYZE, BUFFERS)` for slow queries.
- Keep indexes aligned with access patterns (messages, tasks, files).
- Batch writes and use background workers for heavy tasks.

## 4) Rollout Checklist
- [ ] Create read-replica (with monitoring)
- [ ] Add replica connection parameters to secrets
- [ ] Update TypeORM config to use `replication`
- [ ] Deploy PgBouncer and point app to it
- [ ] Tune pool sizes and DB parameters
- [ ] Run load tests and observe p95 latency, error rate
- [ ] Update runbooks (backup/DR) with replica specifics
