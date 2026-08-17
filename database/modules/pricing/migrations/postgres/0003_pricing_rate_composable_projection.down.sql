-- sdkwork:migration
-- id: 0003_pricing_rate_composable_projection
-- engine: postgres
-- module: pricing
-- purpose: Remove the composable rate projection columns.
-- reversible: true
-- rollback: down-migration
-- transactional: true

ALTER TABLE pricing_rate
    DROP COLUMN IF EXISTS schedule,
    DROP COLUMN IF EXISTS rate_variant,
    DROP COLUMN IF EXISTS formula,
    DROP COLUMN IF EXISTS tiers,
    DROP COLUMN IF EXISTS conditions,
    DROP COLUMN IF EXISTS endpoint_code,
    DROP COLUMN IF EXISTS api_format,
    DROP COLUMN IF EXISTS catalog_key,
    DROP COLUMN IF EXISTS resource_code,
    DROP COLUMN IF EXISTS resource_type,
    DROP COLUMN IF EXISTS account_id,
    DROP COLUMN IF EXISTS provider_code,
    DROP COLUMN IF EXISTS unit_code,
    DROP COLUMN IF EXISTS quantity_kind,
    DROP COLUMN IF EXISTS meter_display_name,
    DROP COLUMN IF EXISTS meter_code,
    DROP COLUMN IF EXISTS operation_display_name,
    DROP COLUMN IF EXISTS operation_kind,
    DROP COLUMN IF EXISTS operation_code,
    DROP COLUMN IF EXISTS product_display_name,
    DROP COLUMN IF EXISTS product_kind,
    DROP COLUMN IF EXISTS product_code;

