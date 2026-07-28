-- sdkwork:migration
-- id: 0001_standardize_observability_query_indexes
-- engine: postgres
-- module: operations
-- purpose: Restore the legacy Operations query index set.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: index-metadata
-- lock_timeout: 5s
-- statement_timeout: 2min
-- contract_version: 0.3.0

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

DROP INDEX IF EXISTS idx_ops_alert_event_tenant_status_latest;
DROP INDEX IF EXISTS idx_ops_alert_event_retention;
DROP INDEX IF EXISTS idx_ops_audit_log_retention;
DROP INDEX IF EXISTS idx_ops_config_snapshot_retention;
DROP INDEX IF EXISTS idx_ops_gateway_heartbeat_instance_status_time;
DROP INDEX IF EXISTS idx_ops_gateway_heartbeat_retention;
DROP INDEX IF EXISTS idx_ops_gateway_instance_tenant_status_heartbeat;
DROP INDEX IF EXISTS idx_ops_job_execution_retention;

CREATE INDEX IF NOT EXISTS idx_ops_alert_event_status_severity
    ON ops_alert_event (alert_status, severity, last_seen_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_instance_time
    ON ops_gateway_heartbeat (instance_id, heartbeat_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_instance_region_status
    ON ops_gateway_instance (region, cell, health_status, last_heartbeat_at);

COMMIT;
