-- sdkwork:migration
-- id: 0002_ai_request_trace_gateway_attribution
-- engine: postgres
-- module: clawrouter
-- purpose: Roll back gateway attribution and retention/query indexes after a compatibility preflight.
-- reversible: true
-- transactional: true
-- lock: table
-- contract_version: 0.3.0

BEGIN;

DO $sdkwork_rollback$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM ai_request_trace
         WHERE error_type IS NOT NULL
           AND lower(trim(error_type::text)) NOT IN (
               'provider_error', 'invalid_request_error', 'billing_error',
               '1', '2', '3'
           )
    ) THEN
        RAISE EXCEPTION
            'cannot roll back ai_request_trace.error_type: unsupported textual values exist';
    END IF;
    IF EXISTS (
        SELECT 1
          FROM ai_request_trace
         WHERE gateway_instance_id IS NOT NULL
            OR gateway_instance_code_snapshot IS NOT NULL
            OR gateway_region_code_snapshot IS NOT NULL
            OR gateway_node_name_snapshot IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'cannot roll back ai_request_trace gateway attribution: snapshot data exists';
    END IF;
END
$sdkwork_rollback$;

ALTER TABLE ai_request_trace
    ALTER COLUMN error_type TYPE INTEGER
    USING CASE lower(trim(error_type::text))
        WHEN 'provider_error' THEN 1
        WHEN 'invalid_request_error' THEN 2
        WHEN 'billing_error' THEN 3
        WHEN '1' THEN 1
        WHEN '2' THEN 2
        WHEN '3' THEN 3
        ELSE NULL
    END;

ALTER TABLE ai_request_trace
    DROP COLUMN IF EXISTS gateway_instance_id,
    DROP COLUMN IF EXISTS gateway_instance_code_snapshot,
    DROP COLUMN IF EXISTS gateway_region_code_snapshot,
    DROP COLUMN IF EXISTS gateway_node_name_snapshot;

DROP INDEX IF EXISTS idx_ai_request_trace_retention;
DROP INDEX IF EXISTS idx_ai_routing_decision_log_retention;
DROP INDEX IF EXISTS idx_ai_config_change_event_retention;
DROP INDEX IF EXISTS idx_ai_pricing_import_snapshot_retention;
DROP INDEX IF EXISTS idx_ai_usage_retention;
DROP INDEX IF EXISTS idx_ai_usage_service_provider_edge_retention;
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
