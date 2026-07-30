-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.
-- Registry version: 0.4.0.
-- Registry SHA-256: edfc49473778989d55fabbfe5adec6d498cb8f6ebffc31daeb3ebb56c15d70f8.
-- Dialect: postgres.
-- Materialize: python -B -m tools.schema_compiler --dialect postgres --materialize.
-- Do not edit by hand; update Schema Registry and regenerate.

CREATE TABLE IF NOT EXISTS ops_alert_event (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    alert_no VARCHAR(128),
    severity INTEGER,
    source VARCHAR(128),
    title VARCHAR(200),
    message VARCHAR(1024),
    alert_status INTEGER,
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT,
    CONSTRAINT ck_ops_alert_event_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_alert_event_no ON ops_alert_event (alert_no);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_tenant_status_latest ON ops_alert_event (tenant_id, organization_id, status, last_seen_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_retention ON ops_alert_event (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_audit_log (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    operator_id BIGINT,
    action VARCHAR(128),
    target_type INTEGER,
    target_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    operator_type INTEGER,
    operator_name_snapshot VARCHAR(128),
    target_uuid VARCHAR(64),
    client_ip_hash VARCHAR(128),
    user_agent_hash VARCHAR(128),
    before_hash VARCHAR(128),
    after_hash VARCHAR(128),
    change_summary JSONB,
    risk_level INTEGER,
    approval_id BIGINT,
    CONSTRAINT ck_ops_audit_log_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_operator_created ON ops_audit_log (tenant_id, organization_id, operator_type, operator_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_target_created ON ops_audit_log (tenant_id, organization_id, target_type, target_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_request ON ops_audit_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_retention ON ops_audit_log (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_config_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_no VARCHAR(128),
    config_scope INTEGER,
    config_type INTEGER,
    source_table VARCHAR(128),
    source_ids JSONB,
    config_payload JSONB,
    config_hash VARCHAR(128),
    published_at TIMESTAMPTZ,
    published_by BIGINT,
    rollback_from_snapshot_id BIGINT,
    CONSTRAINT ck_ops_config_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_config_snapshot_no ON ops_config_snapshot (snapshot_no);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_tenant_scope ON ops_config_snapshot (tenant_id, organization_id, config_scope, config_type, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_retention ON ops_config_snapshot (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_gateway_heartbeat (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    instance_id BIGINT,
    heartbeat_at TIMESTAMPTZ,
    cpu_percent NUMERIC(38, 12),
    memory_percent NUMERIC(38, 12),
    disk_percent NUMERIC(38, 12),
    network_in_bytes BIGINT,
    network_out_bytes BIGINT,
    active_connections BIGINT,
    uptime_seconds BIGINT,
    open_file_count BIGINT,
    thread_count BIGINT,
    payload JSONB,
    CONSTRAINT ck_ops_gateway_heartbeat_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_instance_status_time ON ops_gateway_heartbeat (instance_id, status, heartbeat_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_retention ON ops_gateway_heartbeat (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_gateway_instance (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    instance_code VARCHAR(128),
    deployment_mode INTEGER,
    region VARCHAR(64),
    cell VARCHAR(64),
    version_name VARCHAR(64),
    host_name VARCHAR(128),
    ip_address_hash VARCHAR(128),
    ip_address_masked VARCHAR(64),
    node_name VARCHAR(128),
    pod_name VARCHAR(128),
    container_id_hash VARCHAR(128),
    desktop_device_hash VARCHAR(128),
    runtime_type INTEGER,
    orchestrator INTEGER,
    started_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    health_status INTEGER,
    config_hash VARCHAR(128),
    CONSTRAINT ck_ops_gateway_instance_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_gateway_instance_code ON ops_gateway_instance (instance_code);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_instance_tenant_status_heartbeat ON ops_gateway_instance (tenant_id, organization_id, status, deleted_at, last_heartbeat_at, updated_at, id);

CREATE TABLE IF NOT EXISTS ops_job_execution (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    job_name VARCHAR(128),
    job_type INTEGER,
    trigger_type INTEGER,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_ms BIGINT,
    execution_status INTEGER,
    processed_count BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    failure_reason VARCHAR(1024),
    payload JSONB,
    CONSTRAINT ck_ops_job_execution_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_ops_job_execution_name_started ON ops_job_execution (job_name, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_status_started ON ops_job_execution (execution_status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_model_ranking_scope_started ON ops_job_execution (tenant_id, organization_id, status, job_type, job_name, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_retention ON ops_job_execution (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_metric_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    metric_scope INTEGER NOT NULL,
    metric_name VARCHAR(128) NOT NULL,
    metric_period INTEGER NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ,
    dimension_key VARCHAR(128) NOT NULL,
    dimension_value VARCHAR(256) NOT NULL,
    metric_value NUMERIC(38, 12) NOT NULL,
    metric_unit VARCHAR(64),
    payload JSONB,
    CONSTRAINT ck_ops_metric_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ops_metric_snapshot_period_interval CHECK (period_end IS NULL OR period_end > period_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_metric_snapshot ON ops_metric_snapshot (tenant_id, organization_id, metric_scope, metric_name, metric_period, period_start, dimension_key, dimension_value);

CREATE TABLE IF NOT EXISTS ops_notification_message (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    app_id VARCHAR(128),
    scope_type INTEGER NOT NULL DEFAULT 1,
    message_code VARCHAR(128),
    message_type INTEGER,
    title VARCHAR(200),
    summary VARCHAR(512),
    content TEXT,
    severity INTEGER,
    priority INTEGER NOT NULL DEFAULT 0,
    show_as_popup BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(1024),
    published_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    CONSTRAINT ck_ops_notification_message_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_notification_message_scope_id ON ops_notification_message (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_message_scope ON ops_notification_message (tenant_id, organization_id, app_id, scope_type, status, published_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_message_popup ON ops_notification_message (tenant_id, organization_id, show_as_popup, published_at, id);

CREATE TABLE IF NOT EXISTS ops_notification_delivery (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    app_id VARCHAR(128) NOT NULL DEFAULT 'default',
    message_id BIGINT NOT NULL,
    delivery_channel INTEGER NOT NULL,
    delivery_status INTEGER,
    read_at TIMESTAMPTZ,
    popup_seen_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failure_code VARCHAR(128),
    retry_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_ops_notification_delivery_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_ops_notification_delivery_message FOREIGN KEY (tenant_id, organization_id, message_id) REFERENCES ops_notification_message (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ops_notification_delivery_retry_count CHECK (retry_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_notification_delivery_user_message_app ON ops_notification_delivery (tenant_id, organization_id, message_id, user_id, app_id, delivery_channel);
CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_user_read ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, read_at, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_delivery_popup_seen ON ops_notification_delivery (tenant_id, organization_id, user_id, app_id, popup_seen_at, id);

CREATE TABLE IF NOT EXISTS ops_notification_recipient (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    message_id BIGINT NOT NULL,
    app_id VARCHAR(128),
    recipient_type INTEGER NOT NULL,
    recipient_value VARCHAR(256),
    recipient_user_id BIGINT,
    recipient_role_code VARCHAR(128),
    CONSTRAINT ck_ops_notification_recipient_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ops_notification_recipient_message FOREIGN KEY (tenant_id, organization_id, message_id) REFERENCES ops_notification_message (tenant_id, organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_message ON ops_notification_recipient (tenant_id, organization_id, message_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_user ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_user_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_role ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_role_code, status, id);
