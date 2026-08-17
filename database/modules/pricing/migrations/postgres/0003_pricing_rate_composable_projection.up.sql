-- sdkwork:migration
-- id: 0003_pricing_rate_composable_projection
-- engine: postgres
-- module: pricing
-- purpose: Project legacy pricing relation keys into the composable rate shape.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

ALTER TABLE pricing_rate
    ADD COLUMN IF NOT EXISTS product_code VARCHAR(160),
    ADD COLUMN IF NOT EXISTS product_kind VARCHAR(64),
    ADD COLUMN IF NOT EXISTS product_display_name VARCHAR(256),
    ADD COLUMN IF NOT EXISTS operation_code VARCHAR(160),
    ADD COLUMN IF NOT EXISTS operation_kind VARCHAR(64),
    ADD COLUMN IF NOT EXISTS operation_display_name VARCHAR(256),
    ADD COLUMN IF NOT EXISTS meter_code VARCHAR(96),
    ADD COLUMN IF NOT EXISTS meter_display_name VARCHAR(256),
    ADD COLUMN IF NOT EXISTS quantity_kind VARCHAR(64),
    ADD COLUMN IF NOT EXISTS unit_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS provider_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS account_id BIGINT,
    ADD COLUMN IF NOT EXISTS resource_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS resource_code VARCHAR(256),
    ADD COLUMN IF NOT EXISTS catalog_key VARCHAR(256),
    ADD COLUMN IF NOT EXISTS api_format VARCHAR(64),
    ADD COLUMN IF NOT EXISTS endpoint_code VARCHAR(160),
    ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tiers JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS formula JSONB,
    ADD COLUMN IF NOT EXISTS rate_variant VARCHAR(32) DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS schedule JSONB;

-- Backfilling a legacy row changes only its projected dimensions. The
-- composable immutability guard must not reject that one-time data repair.
ALTER TABLE pricing_rate DISABLE TRIGGER trg_pricing_rate_active_book_guard;

UPDATE pricing_rate AS rate
SET product_code = COALESCE(NULLIF(BTRIM(product.product_code), ''), 'unknown'),
    product_kind = COALESCE(NULLIF(BTRIM(product.product_kind), ''), 'unknown'),
    product_display_name = COALESCE(NULLIF(BTRIM(product.display_name), ''), rate.rate_code),
    operation_code = COALESCE(NULLIF(BTRIM(operation.operation_code), ''), 'unknown'),
    operation_kind = COALESCE(NULLIF(BTRIM(operation.operation_kind), ''), 'unknown'),
    operation_display_name = COALESCE(NULLIF(BTRIM(operation.display_name), ''), rate.rate_code),
    meter_code = COALESCE(NULLIF(BTRIM(meter.meter_code), ''), 'unknown'),
    meter_display_name = COALESCE(NULLIF(BTRIM(meter.display_name), ''), rate.rate_code),
    quantity_kind = COALESCE(NULLIF(BTRIM(meter.quantity_kind), ''), 'quantity'),
    unit_code = COALESCE(NULLIF(BTRIM(meter.unit_code), ''), 'unit'),
    provider_code = COALESCE(NULLIF(BTRIM(rate.vendor_code), ''), 'unknown'),
    resource_type = COALESCE(NULLIF(BTRIM(product.product_kind), ''), 'unknown'),
    resource_code = COALESCE(NULLIF(BTRIM(product.product_code), ''), rate.rate_code),
    conditions = COALESCE(rate.conditions, '[]'::jsonb),
    tiers = COALESCE(rate.tiers, '[]'::jsonb),
    rate_variant = COALESCE(NULLIF(BTRIM(rate.rate_variant), ''), 'standard')
FROM pricing_product AS product,
     pricing_operation AS operation,
     pricing_meter AS meter
WHERE product.tenant_id = rate.tenant_id
  AND product.organization_id = rate.organization_id
  AND product.id = rate.product_id
  AND operation.tenant_id = rate.tenant_id
  AND operation.organization_id = rate.organization_id
  AND operation.id = rate.operation_id
  AND meter.tenant_id = rate.tenant_id
  AND meter.organization_id = rate.organization_id
  AND meter.id = rate.meter_id;

UPDATE pricing_rate
SET product_code = COALESCE(NULLIF(BTRIM(product_code), ''), 'unknown'),
    product_kind = COALESCE(NULLIF(BTRIM(product_kind), ''), 'unknown'),
    product_display_name = COALESCE(NULLIF(BTRIM(product_display_name), ''), rate_code),
    operation_code = COALESCE(NULLIF(BTRIM(operation_code), ''), 'unknown'),
    operation_kind = COALESCE(NULLIF(BTRIM(operation_kind), ''), 'unknown'),
    operation_display_name = COALESCE(NULLIF(BTRIM(operation_display_name), ''), rate_code),
    meter_code = COALESCE(NULLIF(BTRIM(meter_code), ''), 'unknown'),
    meter_display_name = COALESCE(NULLIF(BTRIM(meter_display_name), ''), rate_code),
    quantity_kind = COALESCE(NULLIF(BTRIM(quantity_kind), ''), 'quantity'),
    unit_code = COALESCE(NULLIF(BTRIM(unit_code), ''), 'unit'),
    provider_code = COALESCE(NULLIF(BTRIM(provider_code), ''), 'unknown'),
    resource_type = COALESCE(NULLIF(BTRIM(resource_type), ''), 'unknown'),
    resource_code = COALESCE(NULLIF(BTRIM(resource_code), ''), rate_code),
    conditions = COALESCE(conditions, '[]'::jsonb),
    tiers = COALESCE(tiers, '[]'::jsonb),
    rate_variant = COALESCE(NULLIF(BTRIM(rate_variant), ''), 'standard');

ALTER TABLE pricing_rate
    ALTER COLUMN product_code SET NOT NULL,
    ALTER COLUMN product_kind SET NOT NULL,
    ALTER COLUMN product_display_name SET NOT NULL,
    ALTER COLUMN operation_code SET NOT NULL,
    ALTER COLUMN operation_kind SET NOT NULL,
    ALTER COLUMN operation_display_name SET NOT NULL,
    ALTER COLUMN meter_code SET NOT NULL,
    ALTER COLUMN meter_display_name SET NOT NULL,
    ALTER COLUMN quantity_kind SET NOT NULL,
    ALTER COLUMN unit_code SET NOT NULL,
    ALTER COLUMN provider_code SET NOT NULL,
    ALTER COLUMN resource_type SET NOT NULL,
    ALTER COLUMN resource_code SET NOT NULL,
    ALTER COLUMN conditions SET NOT NULL,
    ALTER COLUMN tiers SET NOT NULL,
    ALTER COLUMN rate_variant SET NOT NULL;

ALTER TABLE pricing_rate ENABLE TRIGGER trg_pricing_rate_active_book_guard;
