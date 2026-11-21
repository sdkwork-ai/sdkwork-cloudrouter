-- sdkwork:migration
-- id: 0039_sdkwork_node_registry
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Materialize the Snowflake runtime node registry (`sdkwork_node_registry`)
--   so a least-privilege runtime role never needs schema CREATE at startup.
--   The table shape is owned by `sdkwork-database-id`'s node allocator; this
--   migration provisions it through the release/operator lifecycle instead of
--   the runtime allocation path. IF NOT EXISTS keeps it a no-op on databases
--   where an elevated install already created the registry.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS sdkwork_node_registry (
    node_id INTEGER PRIMARY KEY CHECK (node_id BETWEEN 0 AND 1023),
    service_name TEXT NOT NULL,
    instance_identity TEXT NOT NULL,
    hostname TEXT NOT NULL,
    pid BIGINT NOT NULL,
    lease_token TEXT NOT NULL,
    lease_version BIGINT NOT NULL DEFAULT 1,
    started_at_ms BIGINT NOT NULL,
    last_heartbeat_at_ms BIGINT NOT NULL,
    expires_at_ms BIGINT NOT NULL
);

-- Lease acquisition scans for expired rows of a service; the PK covers
-- exact node lookups.
CREATE INDEX IF NOT EXISTS idx_sdkwork_node_registry_service_expiry
    ON sdkwork_node_registry (service_name, expires_at_ms);

COMMIT;
