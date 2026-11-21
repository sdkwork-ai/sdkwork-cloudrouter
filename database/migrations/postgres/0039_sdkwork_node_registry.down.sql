-- sdkwork:migration
-- id: 0039_sdkwork_node_registry
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Drop the runtime node registry. Only valid when no process holds a
--   live lease; every writer would fail closed until the registry is
--   re-provisioned.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_sdkwork_node_registry_service_expiry;
DROP TABLE IF EXISTS sdkwork_node_registry;

COMMIT;
