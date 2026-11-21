-- sdkwork:migration
-- id: 0035_ai_metering_usage_settlement_columns
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the usage-settlement tracking columns (`settled_at`,
--   `failure_code`) that usage_settlement_store writes for retryable
--   settlement attempts. The baseline table only carries
--   `settlement_status`/`settlement_id`/`pricing_snapshot`; without these
--   columns the settlement and reconciliation SQL fails at runtime once an
--   upstream call succeeds.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE ai_metering_usage
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

ALTER TABLE ai_metering_usage
    ADD COLUMN IF NOT EXISTS failure_code VARCHAR(64);

COMMIT;
