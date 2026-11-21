-- sdkwork:migration
-- id: 0040_ai_metering_usage_claim_indexes
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Drop the settlement-claim and tenant-analytics covering indexes.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

DROP INDEX IF EXISTS idx_ai_metering_usage_tenant_occurred;
DROP INDEX IF EXISTS idx_ai_metering_usage_settlement_claim;

COMMIT;
