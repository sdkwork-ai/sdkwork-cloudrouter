-- sdkwork:migration
-- id: 0006_pricing_default_region
-- engine: postgres
-- module: pricing
-- purpose: Drop admin-configured default billing region table.
-- reversible: true
-- rollback: up-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

DROP TABLE IF EXISTS pricing_default_region;