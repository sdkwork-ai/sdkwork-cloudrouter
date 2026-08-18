-- sdkwork:migration
-- id: 0004_pricing_rate_legacy_keys_nullable
-- engine: postgres
-- module: pricing
-- purpose: Restore the retired relation-key requirements.
-- reversible: true
-- rollback: down-migration
-- transactional: true

-- The retired relation-key columns exist only in the pre-composable schema;
-- fresh installs never had them, so restore requirements only when present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ANY (current_schemas(false))
          AND table_name = 'pricing_rate'
          AND column_name IN ('product_id', 'operation_id', 'meter_id')
    ) THEN
        ALTER TABLE pricing_rate
            ALTER COLUMN product_id SET NOT NULL,
            ALTER COLUMN operation_id SET NOT NULL,
            ALTER COLUMN meter_id SET NOT NULL;
    END IF;
END
$$;

