-- sdkwork:migration
-- id: 0008_pricing_resource_region_resolution
-- engine: postgres
-- module: pricing
-- purpose: Promote "resource + region" to a first-class pricing dimension.
--   Adds the composite resource/region index that backs the admin list's
--   per-resource region tabs, publishes the pricing_resource_region_coverage
--   view (one row per resource/region: rate count, currency, price book) as
--   the authoritative source for the default-region dropdown and for
--   verifying that a configured default region is actually priced, and widens
--   the default-region lookup index so the runtime billing chain resolves a
--   resource's default region without a heap fetch.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

-- Region-scoped resource lookup. The admin price settings list renders one row
-- per resource with one tab per region, so the dominant access path is
-- "every price of resource X in region Y" plus "which regions does resource X
-- price". The single-column idx_pricing_rate_resource_key (0007) cannot serve
-- either without a recheck.
CREATE INDEX IF NOT EXISTS idx_pricing_rate_resource_region
    ON pricing_rate (
        pricing_resource_key(vendor_code, provider_code, COALESCE(catalog_key, ''), product_code, resource_code),
        region_code,
        currency_code
    );

-- Covering index for the default billing region lookup performed on every
-- priced request (resource_key -> default_region_code/currency_code).
DROP INDEX IF EXISTS idx_pricing_default_region_resource_key;
CREATE INDEX IF NOT EXISTS idx_pricing_default_region_resource_lookup
    ON pricing_default_region (tenant_id, organization_id, resource_key)
    INCLUDE (default_region_code, currency_code, status)
    WHERE deleted_at IS NULL;

-- One row per (resource, region): the authoritative region list of a resource.
-- Used by the admin default-region dropdown, by the price settings region
-- tabs, and by operators to detect a default region that points at a region
-- the resource does not price:
--
--   SELECT c.resource_key, d.default_region_code
--   FROM pricing_default_region d
--   LEFT JOIN pricing_resource_region_coverage c
--          ON c.resource_key = d.resource_key
--         AND c.region_code = d.default_region_code
--   WHERE d.deleted_at IS NULL AND c.resource_key IS NULL;
CREATE OR REPLACE VIEW pricing_resource_region_coverage AS
SELECT
    pricing_resource_key(r.vendor_code, r.provider_code, COALESCE(r.catalog_key, ''),
        r.product_code, r.resource_code) AS resource_key,
    r.tenant_id,
    r.organization_id,
    r.vendor_code,
    r.provider_code,
    r.catalog_key,
    r.product_code,
    r.resource_code,
    r.resource_type,
    r.region_code,
    MIN(r.currency_code) AS currency_code,
    COUNT(*) AS rate_count,
    COUNT(DISTINCT r.currency_code) AS currency_count,
    MIN(book.price_book_code) AS price_book_code,
    MIN(book.price_book_version) AS price_book_version
FROM pricing_rate r
JOIN pricing_price_book book
  ON book.tenant_id = r.tenant_id
 AND book.organization_id = r.organization_id
 AND book.id = r.price_book_id
 AND book.status = 1
 AND book.deleted_at IS NULL
 AND book.lifecycle_state = 'active'
WHERE r.deleted_at IS NULL
  AND r.status = 1
  AND r.effective_from <= CURRENT_TIMESTAMP
  AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
GROUP BY
    r.tenant_id, r.organization_id, r.vendor_code, r.provider_code,
    COALESCE(r.catalog_key, ''), r.product_code, r.resource_code,
    r.resource_type, r.region_code, r.catalog_key;
