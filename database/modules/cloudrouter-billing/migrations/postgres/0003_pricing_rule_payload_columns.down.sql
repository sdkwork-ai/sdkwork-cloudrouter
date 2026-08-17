-- sdkwork:migration
-- id: 0003_pricing_rule_payload_columns
-- engine: postgres
-- purpose: Remove the pricing-rule JSON payload columns.
-- reversible: true
-- rollback: down-migration
-- transactional: true

ALTER TABLE cloudrouter_pricing_rule
    DROP COLUMN IF EXISTS schedule,
    DROP COLUMN IF EXISTS conditions;

