-- sdkwork:migration
-- id: 0007_pricing_catalog_generation
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Remove the catalog generation counter, its triggers and its helper
--   functions, restoring the pre-0007 shape.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

DROP TRIGGER IF EXISTS trg_cloudrouter_group_resource_price_generation ON cloudrouter_group_resource_price;
DROP TRIGGER IF EXISTS trg_cloudrouter_account_rate_card_generation ON cloudrouter_account_rate_card;
DROP TRIGGER IF EXISTS trg_cloudrouter_pricing_rule_generation ON cloudrouter_pricing_rule;
DROP TRIGGER IF EXISTS trg_cloudrouter_pricing_plan_generation ON cloudrouter_pricing_plan;
DROP TRIGGER IF EXISTS trg_pricing_default_region_generation ON pricing_default_region;
DROP TRIGGER IF EXISTS trg_pricing_rate_generation ON pricing_rate;
DROP TRIGGER IF EXISTS trg_pricing_price_book_generation ON pricing_price_book;

DROP FUNCTION IF EXISTS cloudrouter_trigger_catalog_generation();
DROP FUNCTION IF EXISTS cloudrouter_bump_catalog_generation(VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, VARCHAR);

DROP TABLE IF EXISTS cloudrouter_catalog_generation;
