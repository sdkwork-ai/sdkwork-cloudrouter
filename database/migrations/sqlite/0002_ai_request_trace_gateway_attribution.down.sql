-- sdkwork:migration
-- id: 0002_ai_request_trace_gateway_attribution
-- engine: sqlite
-- module: clawrouter
-- purpose: Restore the pre-attribution trace table shape and integer error type after a compatibility preflight.
-- reversible: true
-- transactional: true
-- lock: table
-- contract_version: 0.3.0

PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

CREATE TEMP TABLE __clawrouter_trace_rollback_guard (
    ok INTEGER NOT NULL CHECK (ok = 1)
);
INSERT INTO __clawrouter_trace_rollback_guard (ok)
SELECT CASE WHEN EXISTS (
    SELECT 1
      FROM ai_request_trace
     WHERE error_type IS NOT NULL
       AND lower(trim(CAST(error_type AS TEXT))) NOT IN (
           'provider_error', 'invalid_request_error', 'billing_error',
           '1', '2', '3'
       )
) OR EXISTS (
    SELECT 1
      FROM ai_request_trace
     WHERE gateway_instance_id IS NOT NULL
        OR gateway_instance_code_snapshot IS NOT NULL
        OR gateway_region_code_snapshot IS NOT NULL
        OR gateway_node_name_snapshot IS NOT NULL
) THEN 0 ELSE 1 END;
DROP TABLE __clawrouter_trace_rollback_guard;

DROP INDEX IF EXISTS uk_ai_request_trace_request_attempt;
DROP INDEX IF EXISTS idx_ai_request_trace_tenant_trace;
DROP INDEX IF EXISTS idx_ai_request_trace_api_key_started;
DROP INDEX IF EXISTS idx_ai_request_trace_model_started;
DROP INDEX IF EXISTS idx_ai_request_trace_tenant_status_started;
DROP INDEX IF EXISTS idx_ai_request_trace_user_status_started;
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

ALTER TABLE ai_request_trace RENAME TO ai_request_trace__migration_0002_down;

CREATE TABLE ai_request_trace (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT NOT NULL,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    attempt_no INTEGER NOT NULL,
    decision_log_id INTEGER,
    api_key_id INTEGER,
    legacy_api_key_id INTEGER,
    api_key_name_snapshot VARCHAR(128),
    channel_group_id INTEGER,
    channel_group_snapshot VARCHAR(128),
    owner_type INTEGER,
    owner_id INTEGER,
    owner_name_snapshot VARCHAR(128),
    provider_id INTEGER,
    channel_id INTEGER,
    channel_name_snapshot VARCHAR(128),
    requested_model VARCHAR(256),
    requested_model_catalog_key VARCHAR(256),
    provider_model VARCHAR(256),
    provider_native_model VARCHAR(256),
    region_code VARCHAR(64),
    endpoint VARCHAR(256),
    request_path VARCHAR(256),
    http_method VARCHAR(16),
    http_status INTEGER,
    provider_error_code VARCHAR(128),
    error_type INTEGER,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    latency_ms INTEGER,
    ttft_ms INTEGER,
    streaming INTEGER,
    request_bytes INTEGER,
    response_bytes INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    cached_tokens INTEGER,
    total_tokens INTEGER,
    request_payload_hash VARCHAR(128),
    response_payload_hash VARCHAR(128),
    error_message_masked VARCHAR(1024),
    reasoning_effort VARCHAR(64),
    client_ip_hash VARCHAR(128),
    client_ip_masked VARCHAR(64),
    client_ip_region VARCHAR(128),
    user_agent_hash VARCHAR(128),
    CONSTRAINT ck_ai_request_trace_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_request_trace_attempt CHECK (attempt_no >= 1),
    CONSTRAINT ck_ai_request_trace_http_status CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
    CONSTRAINT ck_ai_request_trace_non_negative_metrics CHECK ((latency_ms IS NULL OR latency_ms >= 0) AND (ttft_ms IS NULL OR ttft_ms >= 0) AND (prompt_tokens IS NULL OR prompt_tokens >= 0) AND (completion_tokens IS NULL OR completion_tokens >= 0) AND (cached_tokens IS NULL OR cached_tokens >= 0) AND (total_tokens IS NULL OR total_tokens >= 0))
);

INSERT INTO ai_request_trace (
    id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, payload_hash, status,
    created_at, retention_until, legal_hold, metadata, attempt_no, decision_log_id, api_key_id,
    legacy_api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
    owner_type, owner_id, owner_name_snapshot, provider_id, channel_id, channel_name_snapshot,
    requested_model, requested_model_catalog_key, provider_model, provider_native_model,
    region_code, endpoint, request_path, http_method, http_status, provider_error_code,
    error_type, started_at, ended_at, latency_ms, ttft_ms, streaming, request_bytes,
    response_bytes, prompt_tokens, completion_tokens, cached_tokens, total_tokens,
    request_payload_hash, response_payload_hash, error_message_masked, reasoning_effort,
    client_ip_hash, client_ip_masked, client_ip_region, user_agent_hash
)
SELECT
    id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, payload_hash, status,
    created_at, retention_until, legal_hold, metadata, attempt_no, decision_log_id, api_key_id,
    legacy_api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
    owner_type, owner_id, owner_name_snapshot, provider_id, channel_id, channel_name_snapshot,
    requested_model, requested_model_catalog_key, provider_model, provider_native_model,
    region_code, endpoint, request_path, http_method, http_status, provider_error_code,
    CASE lower(trim(CAST(error_type AS TEXT)))
        WHEN 'provider_error' THEN 1
        WHEN 'invalid_request_error' THEN 2
        WHEN 'billing_error' THEN 3
        WHEN '1' THEN 1
        WHEN '2' THEN 2
        WHEN '3' THEN 3
        ELSE NULL
    END,
    started_at, ended_at, latency_ms, ttft_ms, streaming, request_bytes, response_bytes,
    prompt_tokens, completion_tokens, cached_tokens, total_tokens, request_payload_hash,
    response_payload_hash, error_message_masked, reasoning_effort, client_ip_hash,
    client_ip_masked, client_ip_region, user_agent_hash
FROM ai_request_trace__migration_0002_down;

DROP TABLE ai_request_trace__migration_0002_down;

CREATE UNIQUE INDEX uk_ai_request_trace_request_attempt
    ON ai_request_trace (tenant_id, organization_id, request_id, attempt_no);
CREATE INDEX idx_ai_request_trace_tenant_trace
    ON ai_request_trace (tenant_id, organization_id, trace_id);
CREATE INDEX idx_ai_request_trace_api_key_started
    ON ai_request_trace (tenant_id, organization_id, api_key_id, started_at, id);
CREATE INDEX idx_ai_request_trace_model_started
    ON ai_request_trace (tenant_id, organization_id, requested_model, started_at, id);
CREATE INDEX idx_ai_request_trace_tenant_status_started
    ON ai_request_trace (tenant_id, organization_id, status, started_at, id);
CREATE INDEX idx_ai_request_trace_user_status_started
    ON ai_request_trace (tenant_id, organization_id, user_id, status, started_at, id);

CREATE INDEX IF NOT EXISTS idx_ops_alert_event_status_severity
    ON ops_alert_event (alert_status, severity, last_seen_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_instance_time
    ON ops_gateway_heartbeat (instance_id, heartbeat_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_instance_region_status
    ON ops_gateway_instance (region, cell, health_status, last_heartbeat_at);

COMMIT;
PRAGMA foreign_keys = ON;
