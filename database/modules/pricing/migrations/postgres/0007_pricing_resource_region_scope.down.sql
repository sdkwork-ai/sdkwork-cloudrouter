-- sdkwork:migration
-- id: 0007_pricing_resource_region_scope
-- engine: postgres
-- module: pricing
-- purpose: Revert to per-catalog-key default billing region model.
-- reversible: false (down target: 0006 state)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

DROP INDEX IF EXISTS idx_pricing_rate_resource_key;

ALTER TABLE pricing_default_region
    DROP CONSTRAINT IF EXISTS ck_pricing_default_region_resource_key_blank;

DROP INDEX IF EXISTS idx_pricing_default_region_resource_key;
DROP INDEX IF EXISTS uk_pricing_default_region_resource_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_catalog_key
    ON pricing_default_region (tenant_id, organization_id, catalog_key)
    WHERE deleted_at IS NULL;

ALTER TABLE pricing_default_region
    DROP COLUMN IF EXISTS resource_key,
    DROP COLUMN IF EXISTS resource_code,
    DROP COLUMN IF EXISTS provider_code;

DROP FUNCTION IF EXISTS pricing_resource_key(TEXT, TEXT, TEXT, TEXT, TEXT);
