-- MCP module baseline DDL (postgres) — contract v1.1.0

CREATE TABLE IF NOT EXISTS ai_mcp_server_category (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL DEFAULT 0,
    category_code VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id BIGINT NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    icon_ref VARCHAR(512),
    lifecycle_status SMALLINT NOT NULL DEFAULT 1,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    UNIQUE (uuid),
    UNIQUE (tenant_id, category_code)
);

CREATE TABLE IF NOT EXISTS ai_mcp_server (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL DEFAULT 0,
    owner_user_id BIGINT NOT NULL DEFAULT 0,
    server_key VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id BIGINT,
    category_code VARCHAR(128),
    transport VARCHAR(64) NOT NULL DEFAULT 'stdio',
    visibility VARCHAR(32) NOT NULL DEFAULT 'tenant',
    data_scope SMALLINT NOT NULL DEFAULT 3,
    latest_connector_id BIGINT,
    published_connector_id BIGINT,
    health_status VARCHAR(32) NOT NULL DEFAULT 'unknown',
    last_checked_at TIMESTAMPTZ,
    last_error_masked TEXT,
    lifecycle_status SMALLINT NOT NULL DEFAULT 1,
    tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    icon_ref VARCHAR(512),
    published_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    UNIQUE (uuid),
    UNIQUE (tenant_id, server_key)
);

CREATE TABLE IF NOT EXISTS ai_mcp_connector (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL DEFAULT 0,
    server_id BIGINT NOT NULL,
    connector_key VARCHAR(128) NOT NULL,
    publish_status VARCHAR(32) NOT NULL DEFAULT 'draft',
    transport VARCHAR(64) NOT NULL,
    endpoint_url TEXT,
    command_ref TEXT,
    args_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    env_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    auth_type VARCHAR(64) NOT NULL DEFAULT 'none',
    secret_ref VARCHAR(255),
    timeout_ms INTEGER NOT NULL DEFAULT 30000,
    retry_policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    config_hash VARCHAR(128),
    lifecycle_status SMALLINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    UNIQUE (uuid),
    UNIQUE (tenant_id, server_id, connector_key)
);

CREATE TABLE IF NOT EXISTS ai_mcp_tool (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL DEFAULT 0,
    server_id BIGINT NOT NULL,
    connector_id BIGINT NOT NULL,
    tool_key VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    input_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'low',
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lifecycle_status SMALLINT NOT NULL DEFAULT 1,
    rate_limit_policy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_hash VARCHAR(128),
    discovered_at TIMESTAMPTZ,
    last_invoked_at TIMESTAMPTZ,
    sort_weight INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    UNIQUE (uuid),
    UNIQUE (tenant_id, server_id, tool_key)
);

CREATE TABLE IF NOT EXISTS ai_mcp_resource (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL DEFAULT 0,
    server_id BIGINT NOT NULL,
    connector_id BIGINT NOT NULL,
    resource_key VARCHAR(255) NOT NULL,
    uri TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    mime_type VARCHAR(128),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lifecycle_status SMALLINT NOT NULL DEFAULT 1,
    discovered_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    UNIQUE (uuid),
    UNIQUE (tenant_id, server_id, resource_key)
);

CREATE TABLE IF NOT EXISTS ai_mcp_prompt (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL DEFAULT 0,
    server_id BIGINT NOT NULL,
    connector_id BIGINT NOT NULL,
    prompt_key VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    arguments_schema_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    lifecycle_status SMALLINT NOT NULL DEFAULT 1,
    discovered_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NOT NULL DEFAULT 0,
    updated_by BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    UNIQUE (uuid),
    UNIQUE (tenant_id, server_id, prompt_key)
);

CREATE TABLE IF NOT EXISTS ai_mcp_invocation_log (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL DEFAULT 0,
    server_id BIGINT NOT NULL,
    connector_id BIGINT,
    invocation_kind VARCHAR(32) NOT NULL,
    target_key VARCHAR(255) NOT NULL,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    idempotency_key VARCHAR(200),
    request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_json JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    duration_ms INTEGER,
    invoked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (uuid)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_invocation_log_idempotency
    ON ai_mcp_invocation_log (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_mcp_server_category_tenant
    ON ai_mcp_server_category (tenant_id, lifecycle_status, sort_order);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_server_tenant_lifecycle
    ON ai_mcp_server (tenant_id, lifecycle_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_server_tenant_category
    ON ai_mcp_server (tenant_id, category_code)
    WHERE category_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_mcp_connector_server
    ON ai_mcp_connector (tenant_id, server_id, publish_status);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_tool_server_enabled
    ON ai_mcp_tool (tenant_id, server_id, enabled, sort_weight);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_resource_server_enabled
    ON ai_mcp_resource (tenant_id, server_id, enabled);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_prompt_server_enabled
    ON ai_mcp_prompt (tenant_id, server_id, enabled);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_invocation_log_tenant_time
    ON ai_mcp_invocation_log (tenant_id, invoked_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_invocation_log_server_time
    ON ai_mcp_invocation_log (tenant_id, server_id, invoked_at DESC);
