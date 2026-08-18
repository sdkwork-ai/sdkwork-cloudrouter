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

-- The retired relation-key columns (product_id / operation_id / meter_id)
-- exist only in the pre-composable schema; the current baseline creates
-- pricing_rate without them. Skip on fresh installs and apply only to
-- deployments upgraded from the legacy schema.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ANY (current_schemas(false))
          AND table_name = 'pricing_rate'
          AND column_name IN ('product_id', 'operation_id', 'meter_id')
    ) THEN
        ALTER TABLE pricing_rate
            ALTER COLUMN product_id DROP NOT NULL,
            ALTER COLUMN operation_id DROP NOT NULL,
            ALTER COLUMN meter_id DROP NOT NULL;
    END IF;
END
$$;

