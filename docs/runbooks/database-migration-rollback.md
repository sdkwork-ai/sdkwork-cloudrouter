# SDKWork Claw Router - Database Migration Rollback Runbook

**Document Version:** 1.0
**Last Updated:** 2026-07-14
**Owner:** Platform Engineering / clawrouter-data
**Review Frequency:** Quarterly
**Severity:** P1
**Status:** Target procedure only. It is not an approved current-candidate
migration rollback or PITR runbook.

> Migration, database restore, and production deployment changes require human
> review. Do not delete migration history, run an ad hoc down script, or restore
> a backup until the owning database lifecycle, backup, and reconciliation
> procedure are approved and tested.

---

## Table of Contents

1. [Scenario](#scenario)
2. [Prevention](#prevention)
3. [Rollback Procedure](#rollback-procedure)
4. [Verification Checklist](#verification-checklist)
5. [Post-Incident Improvement](#post-incident-improvement)
6. [Related Documents](#related-documents)

---

## Scenario

A Flyway database migration fails partway, or a migration that succeeds at the
DDL level introduces a breaking change (dropped column, renamed table, type
narrowing) that breaks the running gateway. Schema contracts are governed by
the schema registry (see `docs/schema-registry/` and
`TECH-30-flyway-schema-contract-audit.md`); this runbook restores service when a
contract migration goes wrong.

## Prevention

Before any migration reaches production:

- **Back up first.** Obtain evidence for the current candidate's backup,
  archive, isolated restore, and reconciliation procedure. The repository does
  not currently prove a scheduled `pg_dump`/WAL recovery path.
- **Test on staging.** Apply the migration against a staging database restored
  from the latest snapshot; run the schema contract audit:
  ```bash
  pnpm check:alignment:audit
  python -B tools/architecture_standard_guardian.py
  ```
- **Prepare the rollback SQL.** Every migration MUST ship a corresponding
  `down` migration (or an equivalent hand-written rollback script) reviewed
  alongside the `up` migration.
- **Verify Flyway ordering.** Confirm the new version number does not collide
  with applied migrations:
  ```bash
  kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
    psql -h postgres -U clawrouter -c \
    "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
  ```

## Rollback Procedure

### Step 1: Identify the failed migration version

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  psql -h postgres -U clawrouter -c \
  "SELECT installed_rank, version, description, success, installed_on
   FROM flyway_schema_history
   ORDER BY installed_rank DESC LIMIT 5;"
```

A row with `success = false` (or the most recent `success = true` whose DDL
broke the app) is the rollback target.

### Step 2: Scale down writers

Stop the services that write to the affected tables so the rollback runs
against a quiescent database:

```bash
kubectl scale deployment claw-router-gateway --replicas=0 -n clawrouter
kubectl scale deployment claw-router-admin-api --replicas=0 -n clawrouter
```

### Step 3: Execute only the reviewed lifecycle reversal

Do not invoke an arbitrary SQL down file or delete `flyway_schema_history`.
The canonical database lifecycle owner must provide and review the exact
rollback/forward-fix procedure, including migration-history semantics, tenant
data preservation, upgrade compatibility, and an isolated rehearsal. A
history-row delete can conceal an incomplete migration and make recovery less
auditable.

### Step 4: Restore from backup when no down migration exists

If the migration is not reversible (for example, an irreversible `DROP COLUMN`
with no approved recovery path), stop here and invoke the reviewed provider or
`sdkwork-database` PITR procedure. No current-candidate RPO, base-backup/WAL
inventory, isolated restore, or cutover/reconciliation sequence is available
in this repository, so an ad hoc restore must not be attempted.

### Step 5: Verify data integrity

```bash
kubectl exec -it deploy/claw-router-gateway -n clawrouter -- \
  psql -h postgres -U clawrouter -c \
  "SELECT COUNT(*) FROM ai_usage;
   SELECT COUNT(*) FROM ops_audit_log;
   SELECT COUNT(*) FROM ai_routing;"
```

## Verification Checklist

| Check | Command / probe | Pass criteria |
|-------|-----------------|---------------|
| Table structure | `\d ai_usage` against schema registry | Matches `docs/schema-registry/*.yaml` |
| Indexes present | `\di` for critical tables | No missing indexes vs baseline |
| Row counts | `SELECT COUNT(*)` per critical table | Within tolerance of pre-migration snapshot |
| Flyway history clean | `flyway_schema_history` query | No `success = false` rows |
| Application starts | `curl /readyz` after scale-up | Configured dependencies are healthy; this alone does not prove migration/drift or all enabled tables |
| Schema contract audit | `pnpm check:alignment:audit` | exit 0 |
| Gateway healthy | `curl /healthz` | `200 {"status":"ok"}` |

After verification, scale the writers back up:

```bash
kubectl scale deployment claw-router-gateway --replicas=2 -n clawrouter
kubectl scale deployment claw-router-admin-api --replicas=1 -n clawrouter
```

## Post-Incident Improvement

- **Add the missing `down` migration** for the version that lacked one.
- **Extend migration tests** 鈥?add a CI step that applies `up` then `down` on a
  throwaway database and asserts schema equivalence with the baseline.
- **Tighten the schema guardian** 鈥?fail CI when a tenant-scoped table change
  lacks a reversible counterpart (see `TECH-20-schema-guardian-quality-gate.md`).
- Attach immutable current-candidate drill evidence to the runbook index
  ([README.md](README.md)); historical dates are not recovery proof.

## Related Documents

- [Runbook Index](README.md)
- [Disaster Recovery Plan](../../deployments/runbooks/disaster-recovery-plan.md)
- [PostgreSQL HA Failover](postgresql-ha-failover.md)
- [Audit Log Investigation](audit-log-investigation.md)
- Schema registry: [../schema-registry/table-catalog.md](../schema-registry/table-catalog.md)
