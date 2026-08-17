-- sdkwork:migration
-- id: 0005_pricing_rate_catalog_keys
-- engine: postgres
-- module: pricing
-- purpose: Backfill canonical vendor/model catalog keys for legacy rates.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 30s
-- contract_version: 0.5.0

UPDATE pricing_rate
SET catalog_key = BTRIM(vendor_code) || '/' || BTRIM(product_code)
WHERE catalog_key IS NULL
   OR BTRIM(catalog_key) = '';

