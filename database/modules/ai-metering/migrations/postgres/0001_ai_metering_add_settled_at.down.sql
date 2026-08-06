-- sdkwork:migration
-- id: 0001_ai_metering_add_settled_at
-- engine: postgres
-- module: ai-metering
-- purpose: Roll back the settlement completion timestamp and failure columns.

ALTER TABLE ai_metering_usage
    DROP COLUMN IF EXISTS settled_at,
    DROP COLUMN IF EXISTS failure_code,
    DROP COLUMN IF EXISTS failure_message;
