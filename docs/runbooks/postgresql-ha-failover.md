# SDKWork Claw Router - PostgreSQL HA Failover Runbook

**Document Version:** 1.0
**Last Updated:** 2026-06-27
**Owner:** Platform Engineering / clawrouter-release
**Review Frequency:** Quarterly
**Severity:** P0

---

## Table of Contents

1. [Scenario](#scenario)
2. [Architecture](#architecture)
3. [Automatic Failover (Patroni)](#automatic-failover-patroni)
4. [Manual Intervention](#manual-intervention)
5. [Data Recovery](#data-recovery)
6. [RPO / RTO](#rpo--rto)
7. [Related Documents](#related-documents)

---

## Scenario

The PostgreSQL primary fails or becomes unreachable. Claw Router treats the
database as its primary data store (tenants, API keys, usage facts, audit log,
routing config), so a primary loss halts all gateway writes until a replica is
promoted or the primary is restored.

## Architecture

- **Topology**: primary + 1 streaming replication replica + pgBouncer
  connection pooler in front of both.
- **Connection hardening** (per [SECURITY.md](../../SECURITY.md)): connections
  MUST use `sslmode=require` with certificate validation.
- **Pool budget**: per
  [Production Operations](../../deployments/runbooks/production-operations.md),
  budget `(gateway + admin-api + app-api) 脳 max_connections 鈮?PostgreSQL
  max_connections 鈭?headroom`. pgBouncer default pool size is 16 connections
  per service process.

## Automatic Failover (Patroni)

When Patroni manages the cluster, failover is automatic:

1. **Detect** 鈥?Patroni cannot reach the primary (DCS lease expires).
2. **Promote** 鈥?the replica with the highest LSN is promoted to primary.
3. **Re-point** 鈥?the DNS / Service endpoint (`postgres-primary`) is updated to
   the new primary.
4. **Reconnect** 鈥?pgBouncer and the gateway services reconnect through the
   Service; pending transactions retry against the new primary.

Verify automatic failover:

```bash
# Patroni cluster status
kubectl exec -it deploy/patroni -n clawrouter -- \
  patronictl list

# pgBouncer reports a live backend
kubectl exec -it deploy/pgbouncer -n clawrouter -- \
  psql -p 6432 -U clawrouter pgbouncer -c "SHOW POOLS;"
```

Confirm the gateway recovered:

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -s http://localhost:8080/readyz
# Expected: 200 {"status":"ready"}
```

## Manual Intervention

If Patroni did not promote (split brain, DCS outage, or replica lag too high),
intervene manually.

### Step 1: Verify primary reachability

```bash
pg_isready -h postgres-primary -p 5432
# Also confirm the replica is reachable and accepting reads
kubectl exec -it deploy/patroni-replica -n clawrouter -- \
  psql -h postgres-replica -U clawrouter -c "SELECT pg_is_in_recovery();"
```

### Step 2: Check streaming replication state

On the primary (if reachable), confirm replica lag:

```sql
SELECT application_name, state, sync_state,
       sent_lsn, replay_lsn,
       (sent_lsn - replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

On the candidate replica, confirm it is in recovery and how far behind it is:

```sql
SELECT pg_is_in_recovery(), pg_last_wal_replay_lsn(),
       pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) AS lag_bytes;
```

> Promote the replica with the smallest lag to minimize data loss. If lag is
> non-trivial, weigh the RPO impact (see [RPO / RTO](#rpo--rto)) before
> promoting.

### Step 3: Manually promote the replica

```bash
# Promote the replica to primary
kubectl exec -it deploy/patroni-replica -n clawrouter -- \
  pg_ctl promote -D /var/lib/postgresql/data
```

### Step 4: Re-point clients

Update the Service / connection string so gateway, admin-api, and app-api
point at the new primary. pgBouncer's PAUSE/RESUME prevents mid-flight query
loss:

```bash
kubectl exec -it deploy/pgbouncer -n clawrouter -- \
  psql -p 6432 -U clawrouter pgbouncer -c "PAUSE;"
# reconfigure backend to new primary
kubectl exec -it deploy/pgbouncer -n clawrouter -- \
  psql -p 6432 -U clawrouter pgbouncer -c "RELOAD;"
kubectl exec -it deploy/pgbouncer -n clawrouter -- \
  psql -p 6432 -U clawrouter pgbouncer -c "RESUME;"
```

Roll the gateway pods so stale connections to the old primary are dropped:

```bash
kubectl rollout restart deployment/claw-router-gateway -n clawrouter
kubectl rollout status  deployment/claw-router-gateway -n clawrouter
```

## Data Recovery

If the primary is corrupted and no healthy replica remains, restore from WAL
archive + base backup (see
[Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md#point-in-time-recovery-pitr)):

```bash
# Restore base backup, then replay WAL up to the failure point
pg_restore --checkpoint='2026-06-27 02:00:00 UTC' \
  --jobs=4 --dbname=clawrouter /backups/full_latest.dump
restore_command = 'rsync backup-server:/wal/%f %p'
recovery_target_time = '2026-06-27 02:00:00 UTC'
```

For a corruption scoped to specific rows (not a full primary loss), prefer the
targeted PITR in
[Disaster Recovery Plan Scenario 4](../../deployments/runbooks/disaster-recovery-plan.md#scenario-4-data-corruption)
over a full restore.

After restore, validate integrity:

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  psql -h postgres -U clawrouter -c \
  "SELECT COUNT(*) FROM ai_usage;
   SELECT COUNT(*) FROM ops_audit_log;
   SELECT COUNT(*) FROM ai_routing;"
```

## RPO / RTO

Per the [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md):

| Objective | Target | Critical threshold | Mechanism |
|-----------|--------|--------------------|-----------|
| RPO | 5 minutes | 15 minutes | Continuous WAL archiving (`wal_level = replica`, `archive_mode = on`) |
| RTO | 4 hours | 8 hours | Replica promotion or PITR |

A failover that promotes a lagging replica can exceed the 5-minute RPO. If the
candidate replica lag exceeds 5 minutes of WAL, prefer a PITR restore over a
fast promote when the data loss delta is acceptable within the RTO budget.

## Related Documents

- [Runbook Index](README.md)
- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [Production Operations](../../deployments/runbooks/production-operations.md)
- [Database Migration Rollback](database-migration-rollback.md)
- [Security Policy](../../SECURITY.md)
- [Redis Failover](redis-failover.md)
