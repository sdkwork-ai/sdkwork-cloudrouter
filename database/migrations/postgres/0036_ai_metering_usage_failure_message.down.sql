-- sdkwork:migration
-- id: 0036_ai_metering_usage_failure_message
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the failure_message column.
-- reversible: true
-- rollback: down-migration
-- transactional: true

BEGIN;

ALTER TABLE ai_metering_usage
    DROP COLUMN IF EXISTS failure_message;

COMMIT;
