-- sdkwork:migration
-- id: 0036_ai_metering_usage_failure_message
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add `failure_message` to ai_metering_usage so
--   usage_settlement_store.mark_settlement_failed can persist the redacted
--   failure reason alongside failure_code.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE ai_metering_usage
    ADD COLUMN IF NOT EXISTS failure_message VARCHAR(1024);

COMMIT;
