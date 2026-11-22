-- sdkwork:migration
-- id: 0040_ai_metering_usage_claim_indexes
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the settlement-claim and tenant-analytics covering indexes on
--   ai_metering_usage. The settlement worker's global claim sweep filters on
--   (settlement_status) with a COALESCE(occurred_at) order, and the admin
--   analytics read model aggregates tenant-wide time buckets on
--   (tenant_id, occurred_at); neither pattern can use the existing
--   tenant/org-leading indexes, so both full-scanned the largest table.
--   IF NOT EXISTS keeps it a no-op where the baseline already declared them.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

CREATE INDEX IF NOT EXISTS idx_ai_metering_usage_settlement_claim
    ON ai_metering_usage (settlement_status, occurred_at, id);

CREATE INDEX IF NOT EXISTS idx_ai_metering_usage_tenant_occurred
    ON ai_metering_usage (tenant_id, occurred_at, id);

COMMIT;
