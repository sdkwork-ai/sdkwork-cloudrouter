-- sdkwork:migration
-- id: 0007_pricing_resource_region_scope
-- engine: postgres
-- module: pricing
-- purpose: Promote the pricing default billing region model to resource-level
--   identity. Adds the IMMUTABLE pricing_resource_key() helper (single source
--   of truth for "same resource" across regions), resource identity columns on
--   pricing_default_region (provider_code/resource_code/resource_key), swaps
--   the uniqueness key from catalog_key to resource_key so a multi-region
--   resource owns exactly one default region row, and adds a resource-key
--   expression index on pricing_rate so the admin product list can group one
--   row per resource (region tabs inside the row).
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

-- Stable resource identity: md5 over the resource dimension columns that
-- define "one resource" regardless of region / currency / price book.
CREATE OR REPLACE FUNCTION pricing_resource_key(
    vendor_code TEXT,
    provider_code TEXT,
    catalog_key TEXT,
    product_code TEXT,
    resource_code TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT md5(concat_ws(chr(31),
        lower(BTRIM(vendor_code)),
        lower(BTRIM(provider_code)),
        lower(BTRIM(COALESCE(catalog_key, ''))),
        lower(BTRIM(product_code)),
        lower(BTRIM(resource_code))))
$$;

ALTER TABLE pricing_default_region
    ADD COLUMN IF NOT EXISTS provider_code VARCHAR(64) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS resource_code VARCHAR(256) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS resource_key VARCHAR(64) NOT NULL DEFAULT '';

-- Backfill legacy rows (written before resource_code/provider_code existed).
-- resource_code falls back to the catalog_key resource segment; resource_key
-- is always derived through the shared helper so admin rows and the read
-- store agree on the identity.
UPDATE pricing_default_region
SET resource_code = COALESCE(NULLIF(split_part(BTRIM(catalog_key), '/', 2), ''), resource_code),
    resource_key = pricing_resource_key(vendor_code, provider_code, catalog_key, product_code, resource_code)
WHERE deleted_at IS NULL
  AND BTRIM(resource_key) = '';

-- Uniqueness moves from catalog_key to the resource identity: one default
-- billing region per resource (model), even when the resource prices several
-- regions. The partial predicate keeps legacy/empty keys unconstrained during
-- the transition and mirrors ck_pricing_default_region_resource_key_blank.
DROP INDEX IF EXISTS uk_pricing_default_region_catalog_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_resource_key
    ON pricing_default_region (tenant_id, organization_id, resource_key)
    WHERE deleted_at IS NULL AND BTRIM(resource_key) <> '';
CREATE INDEX IF NOT EXISTS idx_pricing_default_region_resource_key
    ON pricing_default_region (tenant_id, organization_id, resource_key, default_region_code, id);
CREATE INDEX IF NOT EXISTS idx_pricing_default_region_catalog_key
    ON pricing_default_region (tenant_id, organization_id, vendor_code, catalog_key, default_region_code, id);

-- Mirrors the baseline check so migrated databases converge with greenfield.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_pricing_default_region_resource_key_blank'
          AND conrelid = 'pricing_default_region'::regclass
    ) THEN
        ALTER TABLE pricing_default_region
            ADD CONSTRAINT ck_pricing_default_region_resource_key_blank
            CHECK (BTRIM(resource_key) <> '');
    END IF;
END
$$;

-- Speed up resource-level grouping / paging in the admin official product
-- list (one row per resource, region tabs inside the row).
CREATE INDEX IF NOT EXISTS idx_pricing_rate_resource_key
    ON pricing_rate (pricing_resource_key(vendor_code, provider_code, COALESCE(catalog_key, ''), product_code, resource_code));
