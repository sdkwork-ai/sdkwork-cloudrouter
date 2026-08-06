-- sdkwork:migration
-- id: 0001_ai_metering_add_settled_at
-- engine: postgres
-- module: ai-metering
-- purpose: Record the settlement completion time and failure details on usage
--          facts after the commerce_settlement bridge table is retired (S2).
--          Admin finance statements count settled usage by this timestamp.

ALTER TABLE ai_metering_usage
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failure_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS failure_message VARCHAR(500);
