# High-Volume Ledger And Trace Evolution

Status: proposed, implementation review required before PostgreSQL DDL cutover
Owner: claw-router-platform / clawrouter-data
Updated: 2026-07-12

## Scope

This decision governs the four fastest-growing Claw Router tables:

- `ai_request_trace`
- `ai_routing_decision_log`
- `ai_usage`
- `ai_usage_service_provider_edge`

The portable PostgreSQL and SQLite baselines remain unpartitioned. PostgreSQL
partitioning is an engine-specific production migration and must not be added
to the generated portable baseline.

## Current Safety Baseline

The current write path depends on global business uniqueness that does not
include a time partition key:

| Table | Required global invariant |
| --- | --- |
| `ai_request_trace` | `(tenant_id, organization_id, request_id, attempt_no)` |
| `ai_routing_decision_log` | `(tenant_id, organization_id, request_id)` |
| `ai_usage` | idempotency key and `(tenant_id, organization_id, request_id, usage_type)` |
| `ai_usage_service_provider_edge` | `(tenant_id, organization_id, usage_fact_id, edge_depth, amount_role)` |

`ai_usage_service_provider_edge` also references `ai_usage` through
`(tenant_id, organization_id, usage_fact_id)`. The runtime recorders rely on
these constraints for idempotent retry and settlement protection.

The first commercial safety phase therefore keeps these tables as indexed hot
stores and adds:

- bounded keyset queries;
- `(retention_until, id)` maintenance indexes;
- explicit legal-hold and archive-before-delete contracts;
- batches capped at 1,000 rows, dry-run by default;
- service-identity authorization and tenant-scope rechecks;
- retention lag, archive, delete, retry, and failure metrics.

## Rejected Direct Migration

Do not convert the existing tables directly to
`PARTITION BY RANGE (created_at)`.

PostgreSQL requires every primary or unique constraint on a partitioned table
to include every partition key column. Adding `created_at` to the current
unique keys would allow the same request or idempotency key to exist in
multiple partitions. Removing the constraints would make duplicate delivery
billable. Either change breaks the current `ON CONFLICT` and settlement
semantics.

Creating only a default partition is also rejected. It changes the DDL shape
without providing pruning, retention, or capacity isolation.

## Chosen Evolution

Use an expand/parallel-run/cutover sequence with an unpartitioned hot ledger
and registry-owned PostgreSQL archive tables partitioned by source time.

### Phase 1: Expand

1. Add archive tables through the schema registry and a reviewed PostgreSQL
   migration. Archive identities must include the source table, source time,
   tenant scope, and source row ID.
2. Create bounded time partitions before accepting archive writes. A default
   partition is an emergency catch-all only and must have a non-empty alert.
3. Add an archive batch manifest containing batch ID, source bounds, row count,
   payload hash, started/completed timestamps, and operator or worker identity.
4. Keep all application writes and uniqueness checks on the hot tables.

### Phase 2: Parallel Run

1. Select candidates by `(retention_until, id)` with
   `legal_hold = false`, `FOR UPDATE SKIP LOCKED`, and a maximum of 1,000 rows.
2. Archive and verify the complete batch before deleting any hot row.
3. Recheck `tenant_id`, `organization_id`, `id`, `retention_until`, and
   `legal_hold` in the delete statement.
4. Archive provider edges before their parent usage facts.
5. Retry idempotently. A duplicate archive delivery must not create a second
   archive row or delete a different hot row.

### Phase 3: Read Cutover

Interactive product queries continue to read the online retention window from
the hot tables. Authorized historical exports use a separate archive query
path. A union of hot and archive data is allowed only behind a bounded time
range and server-side pagination.

### Phase 4: Contract

Drop old compatibility paths only after two complete retention windows have
passed with zero reconciliation differences. Contracting archive columns,
partitions, or manifests requires backup/restore evidence and a new migration
review.

## Capacity Gates

Production partition work starts before any one threshold is exceeded:

| Signal | Review threshold |
| --- | --- |
| Hot table size | 250 GiB or 50 million rows |
| Index size | 150 GiB or 60 percent of table size |
| Indexed trace list p95 | 75 ms at 20-row page size |
| Usage upsert p95 | 50 ms |
| Autovacuum dead tuples | 10 percent for 15 minutes |
| Retention lag | 24 hours |
| Default archive partition rows | any sustained non-zero value |

Capacity tests must use production-shaped tenant skew, duplicate delivery,
settled usage rows, legal holds, and concurrent retention workers. Average-only
benchmarks are not acceptance evidence.

## Migration Contract

```yaml
migration_id: clawrouter-high-volume-archive-v1
owner: clawrouter-data
scope:
  producers:
    - router-service
    - ai-routing-service
  consumers:
    - app gateway trace store
    - admin analytics stores
    - settlement worker
compatibility_window:
  starts_at: release enabling archive dual-write
  ends_at: after two verified retention windows
strategy: expand-contract + parallel-run + dual-write + cutover
rollback:
  supported: true
  steps:
    - stop archive workers
    - keep all reads and writes on hot tables
    - retain archive rows for reconciliation
    - run the reviewed down migration only before archive reads are enabled
verification:
  - apply up/down migrations to a restored staging snapshot
  - prove business-key duplicate rejection during concurrent writes
  - prove archive replay is idempotent
  - prove legal-hold rows are never deleted
  - prove restore and reconciliation row counts and hashes
```

## Go/No-Go Conditions

The production migration is blocked until all of the following evidence is
attached to the change review:

- exact `.up.sql` and `.down.sql` files;
- restored-snapshot runtime and lock-duration measurements;
- duplicate-delivery and settlement immutability tests;
- archive reconciliation with zero missing or extra rows;
- legal-hold and tenant-isolation tests;
- PITR and application rollback drill results;
- query plans for hot and archive paths;
- SRE ownership, alerts, and partition-creation schedule.

Until those conditions pass, the standard alignment audit must report the
partition item as pending. A documentation marker or default-only partition is
not completion evidence.
