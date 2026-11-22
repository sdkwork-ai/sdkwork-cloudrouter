-- sdkwork:migration
-- id: 0035_ai_metering_usage_settlement_columns
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the usage-settlement tracking columns.
-- reversible: true
-- rollback: down-migration
-- transactional: true

BEGIN;

ALTER TABLE ai_metering_usage
    DROP COLUMN IF EXISTS failure_code;

ALTER TABLE ai_metering_usage
    DROP COLUMN IF EXISTS settled_at;

COMMIT;
