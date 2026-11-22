-- sdkwork:migration
-- id: 0024_add_upstream_supplier_protocols
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the protocols JSONB array added to ai_upstream_supplier.
-- reversible: true
-- rollback: self
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier DROP COLUMN IF EXISTS protocols;

COMMIT;
