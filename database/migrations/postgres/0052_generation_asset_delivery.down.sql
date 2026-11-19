-- sdkwork:migration
-- id: 0052_generation_asset_delivery
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Reverse 0052_generation_asset_delivery.up.sql.
--   Only the Cloud Router-owned generation delivery configuration tables are
--   dropped; generated media rows and Drive object-store tables are never
--   touched.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP TABLE IF EXISTS storage_vendor_asset_ttl;
DROP TABLE IF EXISTS storage_generation_delivery_policy;

COMMIT;
