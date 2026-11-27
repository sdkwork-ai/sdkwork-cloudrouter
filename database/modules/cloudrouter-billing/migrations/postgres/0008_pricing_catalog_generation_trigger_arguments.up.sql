-- sdkwork:migration
-- id: 0008_pricing_catalog_generation_trigger_arguments
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Make the catalog-generation trigger call the counter function with
--   argument types PostgreSQL can resolve.
--
--   0007 declared `cloudrouter_bump_catalog_generation(VARCHAR, VARCHAR,
--   BIGINT, BIGINT, VARCHAR, VARCHAR)` and called it from the row trigger with
--   `TG_TABLE_NAME` and `TG_OP` directly. Those built-ins are `name` and
--   `text`, and function resolution only applies a single implicit cast, so
--   `name` never reaches the `VARCHAR` parameter: every insert, update or
--   delete on a pricing table failed with
--
--     function cloudrouter_bump_catalog_generation(unknown, unknown, bigint,
--     bigint, name, text) does not exist
--
--   which blocked the official pricing sync during bootstrap. The call now
--   casts both trigger built-ins explicitly, so resolution succeeds while the
--   counter signature and its callers stay unchanged.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.1

CREATE OR REPLACE FUNCTION cloudrouter_trigger_catalog_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM cloudrouter_bump_catalog_generation(
        'pricing_catalog',
        '',
        COALESCE(NEW.tenant_id, OLD.tenant_id, 0),
        COALESCE(NEW.organization_id, OLD.organization_id, 0),
        TG_TABLE_NAME::VARCHAR,
        TG_OP::VARCHAR
    );
    RETURN COALESCE(NEW, OLD);
END
$$;
