# ai-metering

Cloud Router AI metering database module (table prefix `ai_metering_`).
Owns metering facts (`ai_metering_usage`) and request traces (`ai_metering_request_trace`), co-located with `acct_*` on the federated commerce pool for single-transaction usage settlement.

## Migrations

- `0001_ai_metering_add_settled_at` — adds `settled_at`, `failure_code`, and
  `failure_message` to `ai_metering_usage` after the `commerce_settlement`
  bridge is retired: settlement state (status, completion time, failure
  details) lives on the usage fact itself.
- `0002_ai_metering_backfill_from_legacy` — idempotent backfill of the legacy
  cloudrouter core `ai_usage`/`ai_request_trace` rows into the ai-metering
  tables. Safe to re-run; the legacy tables remain in the root baseline as
  legacy-compat until the DB066/DB068 cleanup plan.

## Reconciliation

Verify the backfill and settlement bookkeeping with:

```sql
-- Backfill coverage: expect 0 rows when the migration is complete.
SELECT 'usage_gap' AS check_name, COUNT(1) AS violations
FROM ai_usage u
WHERE NOT EXISTS (
    SELECT 1 FROM ai_metering_usage m
    WHERE m.tenant_id = u.tenant_id
      AND m.organization_id = u.organization_id
      AND m.id = u.id
)
UNION ALL
SELECT 'trace_gap', COUNT(1)
FROM ai_request_trace t
WHERE NOT EXISTS (
    SELECT 1 FROM ai_metering_request_trace m
    WHERE m.tenant_id = t.tenant_id
      AND m.organization_id = t.organization_id
      AND m.request_id = t.request_id
      AND m.attempt_no = t.attempt_no
);

-- Settlement state coverage: every fact must carry a terminal status with a
-- settlement id and, for successful settlements, a completion time.
SELECT settlement_status, COUNT(1) AS facts,
       COUNT(settlement_id) AS with_settlement_id,
       COUNT(settled_at) AS with_settled_at
FROM ai_metering_usage
GROUP BY settlement_status
ORDER BY settlement_status;
```
