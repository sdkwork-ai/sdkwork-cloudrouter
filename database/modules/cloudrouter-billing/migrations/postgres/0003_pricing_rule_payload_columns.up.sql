-- sdkwork:migration
-- id: 0003_pricing_rule_payload_columns
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Add the JSON payload columns required by pricing-rule guards.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

ALTER TABLE cloudrouter_pricing_rule
    ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS schedule JSONB;

