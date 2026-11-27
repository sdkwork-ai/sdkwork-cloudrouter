-- sdkwork:migration
-- id: 0012_pricing_charge_model_columns
-- engine: postgres
-- module: pricing
-- purpose: Remove the explicit charge-model declaration and restore the
--   pre-0012 shape. `calculation_mode` stays because it predates this change.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

DROP TRIGGER IF EXISTS trg_pricing_rate_sync_calculation_mode ON pricing_rate;
DROP FUNCTION IF EXISTS pricing_sync_calculation_mode();

DROP INDEX IF EXISTS idx_pricing_rate_charge_model;

ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_metering_mode_payload;
ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_included_quantity;
ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_rounding_mode;
ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_quantity_source;
ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_metering_mode;
ALTER TABLE pricing_rate
    DROP CONSTRAINT IF EXISTS ck_pricing_rate_price_item_type;

ALTER TABLE pricing_rate
    DROP COLUMN IF EXISTS included_quantity,
    DROP COLUMN IF EXISTS rounding_mode,
    DROP COLUMN IF EXISTS quantity_source,
    DROP COLUMN IF EXISTS metering_mode,
    DROP COLUMN IF EXISTS price_item_type;
