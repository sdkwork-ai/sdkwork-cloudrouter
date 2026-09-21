-- sdkwork:migration
-- id: 0044_product_catalog_relation_tables
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the four Cloud Router-owned product catalog relation
--   tables so the migration is reversible.
--
--   Only the four tables this migration owns and creates are dropped. None of
--   them carries inbound foreign keys, and the master-data tables they reference
--   (`commerce_product_spu`, `commerce_product_sku`, `commerce_product_category`,
--   `commerce_product_attribute`) are owned by `sdkwork-merchandise` and are left
--   untouched.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_commerce_product_media_owner;
DROP TABLE IF EXISTS commerce_product_media;

DROP INDEX IF EXISTS idx_commerce_product_sku_attribute_value;
DROP INDEX IF EXISTS idx_commerce_product_sku_attribute_sku;
DROP TABLE IF EXISTS commerce_product_sku_attribute;

DROP INDEX IF EXISTS idx_commerce_product_category_attribute_attribute;
DROP INDEX IF EXISTS idx_commerce_product_category_attribute_category;
DROP TABLE IF EXISTS commerce_product_category_attribute;

DROP INDEX IF EXISTS idx_commerce_product_spu_category_spu;
DROP INDEX IF EXISTS idx_commerce_product_spu_category_category;
DROP TABLE IF EXISTS commerce_product_spu_category;

COMMIT;
