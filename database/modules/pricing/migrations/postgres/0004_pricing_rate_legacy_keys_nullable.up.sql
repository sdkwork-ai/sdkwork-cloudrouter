-- sdkwork:migration
-- id: 0004_pricing_rate_legacy_keys_nullable
-- engine: postgres
-- module: pricing
-- purpose: Allow composable rate writes to omit retired relation-key columns.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 30s
-- contract_version: 0.5.0

ALTER TABLE pricing_rate
    ALTER COLUMN product_id DROP NOT NULL,
    ALTER COLUMN operation_id DROP NOT NULL,
    ALTER COLUMN meter_id DROP NOT NULL;

