-- sdkwork:migration
-- id: 0028_add_upstream_supplier_default_base_url
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the default_base_url column on ai_upstream_supplier.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier
    DROP COLUMN IF EXISTS default_base_url;

COMMIT;
