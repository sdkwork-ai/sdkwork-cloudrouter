-- sdkwork:migration
-- id: 0005_pricing_rate_catalog_keys
-- engine: postgres
-- module: pricing
-- purpose: Remove the catalog-key backfill marker from legacy rates.
-- reversible: true
-- rollback: down-migration
-- transactional: true

UPDATE pricing_rate
SET catalog_key = NULL
WHERE catalog_key = BTRIM(vendor_code) || '/' || BTRIM(product_code);

