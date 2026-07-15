# SDKWork Claw Router - PostgreSQL HA Failover Runbook

**Document Version:** 1.0
**Last Updated:** 2026-07-14
**Owner:** Platform Engineering / clawrouter-release
**Review Frequency:** Quarterly
**Severity:** P0
**Status:** Target procedure only. Patroni, pgBouncer, replication, PITR,
RPO/RTO, and transaction recovery have not been demonstrated for the current
candidate.

> Do not promote, restart, scale, restore, or redirect database traffic based
> on this document alone. An in-flight billable or non-idempotent transaction
> can have an unknown outcome after failover; it must not be automatically
> retried until the idempotency key, durable facts, and reconciliation procedure
> establish a safe result.

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

- **Target topology**: primary + 1 streaming replication replica + pgBouncer
  connection pooler in front of both. The deployed current-candidate topology
  and recovery ownership are not verified.
- **Connection hardening** (per [SECURITY.md](../../SECURITY.md)): connections
  MUST use `sslmode=require` with certificate validation.
- **Pool budget**: per
  [Production Operations](../../deployments/runbooks/production-operations.md),
  budget `(gateway + admin-api + app-api) * max_connections <= PostgreSQL
  max_connections - headroom`. pgBouncer default pool size is 16 connections
  per service process.

## Target Automatic Failover (Patroni)

When a reviewed Patroni deployment manages the cluster, its target behavior is:

1. **Detect**: Patroni cannot reach the primary (DCS lease expires).
2. **Promote**: the replica with the highest LSN is promoted to primary.
3. **Re-point**: the DNS / Service endpoint (`postgres-primary`) is updated to
   the new primary.
4. **Reconnect**: pgBouncer and the gateway services reconnect through the
   Service. In-flight transaction outcomes may be unknown; gateway and worker
   code must not automatically retry billable or non-idempotent work merely
   because the connection was lost.

The commands below are examples for an approved, actually deployed Patroni
topology. They are not current-candidate recovery evidence:

```bash
# Patroni cluster status
kubectl exec -it deploy/patroni -n clawrouter -- \
  patronictl list

# pgBouncer reports a live backend
kubectl exec -it deploy/pgbouncer -n clawrouter -- \
  psql -p 6432 -U clawrouter pgbouncer -c "SHOW POOLS;"
```

For an approved deployed topology, `/readyz = 200` only confirms its configured
dependency checks. It does not prove generic schema currency, migration state,
financial reconciliation, or recovery correctness.

Illustrative gateway readiness check:

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  curl -s http://localhost:8080/readyz
# Expected: 200 {"status":"ready"}
```

## Illustrative Manual Intervention (requires approved topology)

If Patroni did not promote (split brain, DCS outage, or replica lag too high),
do not act on the following examples until the deployed topology, data owner,
and incident command have approved a procedure for that specific failure.

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
point at the new primary only through the approved procedure. pgBouncer
`PAUSE`/`RESUME` does not prove transaction atomicity, confirm the outcome of
billable or non-idempotent work, or prevent unknown in-flight outcomes:

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

If the primary is corrupted and no healthy replica remains, do not use an
unverified shell/configuration mixture as a PITR procedure. The current
candidate has no tested base-backup/WAL archive inventory, isolated restore,
validation, reconciliation, or cutover sequence. Define and exercise the
approved provider/`sdkwork-database` procedure before release.

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
| RPO | Not established for current candidate | Not measured | Requires verified WAL/archive, restore, and reconciliation drill |
| RTO | Not established for current candidate | Not measured | Requires verified promotion/PITR and application recovery drill |

A failover can lose or duplicate work when a replica is behind or a transaction
outcome is unknown. Do not choose promotion versus PITR from unverified target
numbers; make the decision through the approved incident, data-integrity, and
Finance/SRE reconciliation process.

## Related Documents

- [Runbook Index](README.md)
- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [Production Operations](../../deployments/runbooks/production-operations.md)
- [Database Migration Rollback](database-migration-rollback.md)
- [Security Policy](../../SECURITY.md)
- [Redis Failover](redis-failover.md)
