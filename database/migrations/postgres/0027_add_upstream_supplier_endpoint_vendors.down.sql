-- sdkwork:migration
-- id: 0027_add_upstream_supplier_endpoint_vendors
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the vendor_codes JSONB column on ai_upstream_supplier_endpoint.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier_endpoint
    DROP COLUMN IF EXISTS vendor_codes;

COMMIT;
