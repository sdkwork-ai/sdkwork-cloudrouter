-- sdkwork:migration
-- id: 0002_ai_request_trace_gateway_attribution
-- engine: sqlite
-- module: clawrouter
-- purpose: Rebuild the trace table with immutable gateway snapshots, text error types, and retention/query indexes.
-- reversible: true
-- transactional: true
-- lock: table
-- contract_version: 0.3.0

-- These expand statements are idempotent and run before the table-rebuild
-- transaction. The framework emulates IF NOT EXISTS for SQLite, allowing the
-- same migration to upgrade the old baseline and safely replay on a folded
-- current baseline without discarding existing attribution values.
ALTER TABLE ai_request_trace
    ADD COLUMN IF NOT EXISTS gateway_instance_id INTEGER,
    ADD COLUMN IF NOT EXISTS gateway_instance_code_snapshot VARCHAR(128),
    ADD COLUMN IF NOT EXISTS gateway_region_code_snapshot VARCHAR(64),
    ADD COLUMN IF NOT EXISTS gateway_node_name_snapshot VARCHAR(128);

PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

DROP INDEX IF EXISTS uk_ai_request_trace_request_attempt;
DROP INDEX IF EXISTS idx_ai_request_trace_tenant_trace;
DROP INDEX IF EXISTS idx_ai_request_trace_api_key_started;
DROP INDEX IF EXISTS idx_ai_request_trace_model_started;
DROP INDEX IF EXISTS idx_ai_request_trace_tenant_status_started;
DROP INDEX IF EXISTS idx_ai_request_trace_user_status_started;
DROP INDEX IF EXISTS idx_ai_request_trace_retention;

ALTER TABLE ai_request_trace RENAME TO ai_request_trace__migration_0002;

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
    gateway_instance_id INTEGER,
    gateway_instance_code_snapshot VARCHAR(128),
    gateway_region_code_snapshot VARCHAR(64),
    gateway_node_name_snapshot VARCHAR(128),
    region_code VARCHAR(64),
    endpoint VARCHAR(256),
    request_path VARCHAR(256),
    http_method VARCHAR(16),
    http_status INTEGER,
    provider_error_code VARCHAR(128),
    error_type VARCHAR(128),
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
    gateway_instance_id, gateway_instance_code_snapshot, gateway_region_code_snapshot,
    gateway_node_name_snapshot, region_code, endpoint, request_path, http_method, http_status,
    provider_error_code, error_type, started_at, ended_at, latency_ms, ttft_ms, streaming,
    request_bytes, response_bytes, prompt_tokens, completion_tokens, cached_tokens, total_tokens,
    request_payload_hash, response_payload_hash, error_message_masked, reasoning_effort,
    client_ip_hash, client_ip_masked, client_ip_region, user_agent_hash
)
SELECT
    id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, payload_hash, status,
    created_at, retention_until, legal_hold, metadata, attempt_no, decision_log_id, api_key_id,
    legacy_api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot,
    owner_type, owner_id, owner_name_snapshot, provider_id, channel_id, channel_name_snapshot,
    requested_model, requested_model_catalog_key, provider_model, provider_native_model,
    gateway_instance_id, gateway_instance_code_snapshot, gateway_region_code_snapshot,
    gateway_node_name_snapshot, region_code, endpoint, request_path, http_method, http_status,
    provider_error_code,
    CASE lower(trim(CAST(error_type AS TEXT)))
        WHEN '1' THEN 'provider_error'
        WHEN '2' THEN 'invalid_request_error'
        WHEN '3' THEN 'billing_error'
        ELSE NULLIF(trim(CAST(error_type AS TEXT)), '')
    END,
    started_at, ended_at, latency_ms, ttft_ms, streaming, request_bytes, response_bytes,
    prompt_tokens, completion_tokens, cached_tokens, total_tokens, request_payload_hash,
    response_payload_hash, error_message_masked, reasoning_effort, client_ip_hash,
    client_ip_masked, client_ip_region, user_agent_hash
FROM ai_request_trace__migration_0002;

DROP TABLE ai_request_trace__migration_0002;

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
CREATE INDEX idx_ai_request_trace_retention
    ON ai_request_trace (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_log_retention
    ON ai_routing_decision_log (retention_until, id);

CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_retention
    ON ai_config_change_event (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_import_snapshot_retention
    ON ai_pricing_import_snapshot (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_retention
    ON ai_usage (retention_until, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_service_provider_edge_retention
    ON ai_usage_service_provider_edge (retention_until, id);
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
PRAGMA foreign_keys = ON;
