-- sdkwork:migration
-- id: 0031_ai_metering_usage_user_index
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Remove the ai_metering_usage user-scoped occurred_at composite
--   index added by the up migration.
-- reversible: true
-- rollback: up-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

DROP INDEX IF EXISTS idx_ai_metering_usage_user_occurred;

COMMIT;
