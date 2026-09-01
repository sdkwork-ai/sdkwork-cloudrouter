-- sdkwork:migration
-- id: 0008_pricing_resource_region_resolution
-- engine: postgres
-- module: pricing
-- purpose: Revert the resource/region access path to the 0007 state.
-- reversible: true (down target: 0007 state)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

DROP VIEW IF EXISTS pricing_resource_region_coverage;

DROP INDEX IF EXISTS idx_pricing_default_region_resource_lookup;
CREATE INDEX IF NOT EXISTS idx_pricing_default_region_resource_key
    ON pricing_default_region (tenant_id, organization_id, resource_key, default_region_code, id);

DROP INDEX IF EXISTS idx_pricing_rate_resource_region;
