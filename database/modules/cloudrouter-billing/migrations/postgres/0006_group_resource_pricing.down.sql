-- sdkwork:migration
-- id: 0006_group_resource_pricing
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Restore the pre-group-resource-pricing shape. The rate-card identity
--   requirement on rated decisions is restored as it was, the pricing-layer
--   audit column is dropped, and the per-resource group price table is removed.
--   This script can only run when no rating decision references a
--   rate-cardless rated shape; otherwise the restored constraint rejects the
--   existing rows and the transaction rolls back (fail closed).
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

ALTER TABLE cloudrouter_rating_decision
    DROP CONSTRAINT IF EXISTS ck_cloudrouter_rating_decision_amount;
ALTER TABLE cloudrouter_rating_decision
    ADD CONSTRAINT ck_cloudrouter_rating_decision_amount
    CHECK (
        (
            decision_status = 'rated'
            AND billability = 'chargeable'
            AND reference_unit_price IS NOT NULL AND reference_unit_price >= 0
            AND (cost_unit_price IS NULL OR cost_unit_price >= 0)
            AND unit_price IS NOT NULL AND unit_price >= 0
            AND reference_amount IS NOT NULL AND reference_amount >= 0
            AND (cost_amount IS NULL OR cost_amount >= 0)
            AND amount IS NOT NULL AND amount >= 0
            AND currency_code IS NOT NULL
            AND unit_size > 0
            AND strategy_code IS NOT NULL
            AND calculation_mode IS NOT NULL
            AND price_book_id IS NOT NULL
            AND rate_id IS NOT NULL
            AND account_rate_card_id IS NOT NULL
            AND pricing_plan_id IS NOT NULL
            AND pricing_rule_id IS NOT NULL
        )
        OR (
            decision_status = 'non_chargeable'
            AND billability IN ('free', 'not_applicable')
            AND reference_amount IS NULL
            AND cost_amount IS NULL
            AND amount IS NULL
            AND currency_code IS NULL
            AND price_book_id IS NOT NULL
            AND rate_id IS NOT NULL
        )
        OR (
            decision_status = 'unrated'
            AND billability IN ('chargeable', 'unknown')
            AND reference_amount IS NULL
            AND cost_amount IS NULL
            AND amount IS NULL
            AND currency_code IS NULL
        )
    );

ALTER TABLE cloudrouter_rating_decision
    DROP CONSTRAINT IF EXISTS ck_cloudrouter_rating_decision_layer;

ALTER TABLE cloudrouter_rating_decision
    DROP COLUMN IF EXISTS pricing_layer;

DROP TABLE IF EXISTS cloudrouter_group_resource_price;
