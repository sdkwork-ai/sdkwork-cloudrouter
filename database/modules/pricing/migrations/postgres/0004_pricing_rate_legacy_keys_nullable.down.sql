-- sdkwork:migration
-- id: 0004_pricing_rate_legacy_keys_nullable
-- engine: postgres
-- module: pricing
-- purpose: Restore the retired relation-key requirements.
-- reversible: true
-- rollback: down-migration
-- transactional: true

ALTER TABLE pricing_rate
    ALTER COLUMN product_id SET NOT NULL,
    ALTER COLUMN operation_id SET NOT NULL,
    ALTER COLUMN meter_id SET NOT NULL;

