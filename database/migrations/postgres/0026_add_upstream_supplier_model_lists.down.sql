-- sdkwork:migration
-- id: 0026_add_upstream_supplier_model_lists
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the model blacklist/whitelist JSONB columns on
--   ai_upstream_supplier.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier
    DROP COLUMN IF EXISTS model_blacklist,
    DROP COLUMN IF EXISTS model_whitelist;

COMMIT;
