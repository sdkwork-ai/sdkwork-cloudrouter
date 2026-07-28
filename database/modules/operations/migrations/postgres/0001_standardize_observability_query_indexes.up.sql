-- sdkwork:migration
-- id: 0001_standardize_observability_query_indexes
-- engine: postgres
-- module: operations
-- purpose: Install tenant, retention, and heartbeat indexes owned by the Operations module.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: index-metadata
-- lock_timeout: 5s
-- statement_timeout: 2min
-- rewrite: Index-only metadata and bounded index builds; no table rewrite.
-- replication_impact: Index build WAL; monitor replica lag on large pre-release datasets.
-- observability: Migration history, index build duration, lock waits, and replica lag.
-- cancellation: Cancel before COMMIT; the transaction restores the previous index set.
-- recovery: Rerun after lock contention clears or apply the reviewed down migration.
-- contract_version: 0.3.0

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

CREATE INDEX IF NOT EXISTS idx_ops_alert_event_tenant_status_latest
    ON ops_alert_event (tenant_id, organization_id, status, last_seen_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_retention
    ON ops_alert_event (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_retention
    ON ops_audit_log (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_retention
    ON ops_config_snapshot (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_instance_status_time
    ON ops_gateway_heartbeat (instance_id, status, heartbeat_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_retention
    ON ops_gateway_heartbeat (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_instance_tenant_status_heartbeat
    ON ops_gateway_instance (
        tenant_id, organization_id, status, deleted_at,
        last_heartbeat_at, updated_at, id
    );
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_retention
    ON ops_job_execution (retention_until, id);

DROP INDEX IF EXISTS idx_ops_alert_event_status_severity;
DROP INDEX IF EXISTS idx_ops_gateway_heartbeat_instance_time;
DROP INDEX IF EXISTS idx_ops_gateway_instance_region_status;

COMMIT;
