-- sdkwork:migration
-- id: 0041_ai_mcp_registry_and_gateway_membership
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Forward-fix for baseline drift: the working baseline gained the
--   ai_mcp_* registry tables, iam_gateway_membership, and two ai_metering_usage
--   indexes without a version bump, so databases installed from an earlier
--   0.5.0 baseline never received them and the postgres-runtime-schema
--   readiness probe fails closed. This migration provisions exactly those
--   objects; IF NOT EXISTS keeps it a no-op where the elevated baseline or a
--   prior install already created them. Table shapes mirror the baseline DDL
--   verbatim so fresh and migrated databases converge on one shape.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS ai_mcp_binding (
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
    server_id BIGINT NOT NULL,
    server_revision_id BIGINT,
    tool_id BIGINT,
    owner_type VARCHAR(64) NOT NULL,
    owner_id BIGINT NOT NULL DEFAULT 0,
    allowed_tools JSONB,
    denied_tools JSONB,
    policy_json JSONB,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT ck_ai_mcp_binding_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_mcp_binding_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND server_id > 0),
    CONSTRAINT ck_ai_mcp_binding_values CHECK (length(owner_type) > 0 AND priority >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_binding_uuid ON ai_mcp_binding (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_mcp_binding_scope_priority ON ai_mcp_binding (tenant_id, organization_id, server_id, priority, id);

CREATE TABLE IF NOT EXISTS ai_mcp_server (
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
    server_key VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(4000),
    category_id BIGINT,
    category_code VARCHAR(128),
    transport VARCHAR(64) NOT NULL DEFAULT 'http',
    visibility VARCHAR(64) NOT NULL DEFAULT 'organization',
    owner_user_id BIGINT NOT NULL DEFAULT 0,
    latest_revision_id BIGINT,
    published_revision_id BIGINT,
    health_status VARCHAR(64) NOT NULL DEFAULT 'unchecked',
    last_checked_at TIMESTAMPTZ,
    last_error_masked VARCHAR(1024),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    published_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_mcp_server_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_mcp_server_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_mcp_server_values CHECK (length(server_key) > 0 AND length(name) > 0 AND length(transport) > 0 AND length(visibility) > 0 AND length(health_status) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_server_uuid ON ai_mcp_server (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_server_scope_key ON ai_mcp_server (tenant_id, organization_id, server_key);
CREATE INDEX IF NOT EXISTS idx_ai_mcp_server_scope_updated ON ai_mcp_server (tenant_id, organization_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_mcp_server_scope_category ON ai_mcp_server (tenant_id, organization_id, category_id);

CREATE TABLE IF NOT EXISTS ai_mcp_server_revision (
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
    server_id BIGINT NOT NULL,
    revision_no VARCHAR(128) NOT NULL,
    transport VARCHAR(64) NOT NULL DEFAULT 'http',
    endpoint_url VARCHAR(1024),
    command VARCHAR(1024),
    args_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    env_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    auth_type VARCHAR(64) NOT NULL DEFAULT 'none',
    secret_ref VARCHAR(512),
    timeout_ms INTEGER NOT NULL DEFAULT 30000,
    retry_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    config_hash VARCHAR(128),
    lifecycle_status VARCHAR(64) NOT NULL DEFAULT 'draft',
    created_by BIGINT,
    published_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_mcp_server_revision_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_mcp_server_revision_subject_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND server_id > 0),
    CONSTRAINT ck_ai_mcp_server_revision_values CHECK (length(revision_no) > 0 AND length(transport) > 0 AND length(lifecycle_status) > 0 AND timeout_ms > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_server_revision_uuid ON ai_mcp_server_revision (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_server_revision_scope_no ON ai_mcp_server_revision (tenant_id, organization_id, server_id, revision_no);
CREATE INDEX IF NOT EXISTS idx_ai_mcp_server_revision_scope_created ON ai_mcp_server_revision (tenant_id, organization_id, server_id, created_at, id);

CREATE TABLE IF NOT EXISTS ai_mcp_tool (
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
    server_id BIGINT NOT NULL,
    server_revision_id BIGINT,
    tool_key VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(4000),
    input_schema JSONB,
    output_schema JSONB,
    risk_level VARCHAR(64) NOT NULL DEFAULT 'low',
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    rate_limit_policy JSONB,
    schema_hash VARCHAR(128),
    discovered_at TIMESTAMPTZ,
    last_invoked_at TIMESTAMPTZ,
    sort_weight INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT ck_ai_mcp_tool_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_mcp_tool_subject_scope CHECK (tenant_id > 0 AND organization_id >= 0 AND server_id > 0),
    CONSTRAINT ck_ai_mcp_tool_values CHECK (length(tool_key) > 0 AND length(name) > 0 AND length(risk_level) > 0 AND sort_weight >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_tool_uuid ON ai_mcp_tool (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_mcp_tool_scope_key ON ai_mcp_tool (tenant_id, organization_id, server_id, tool_key);
CREATE INDEX IF NOT EXISTS idx_ai_mcp_tool_scope_sort ON ai_mcp_tool (tenant_id, organization_id, server_id, sort_weight, id);

CREATE TABLE IF NOT EXISTS iam_gateway_membership (
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
    user_id BIGINT,
    organization_name_snapshot VARCHAR(200),
    is_primary INTEGER,
    member_no VARCHAR(64),
    joined_at TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_membership_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_iam_gateway_membership_tenant_user_status ON iam_gateway_membership (tenant_id, user_id, status, deleted_at, organization_id);

CREATE INDEX IF NOT EXISTS idx_ai_metering_usage_settlement_claim ON ai_metering_usage (settlement_status, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_metering_usage_tenant_occurred ON ai_metering_usage (tenant_id, occurred_at, id);

COMMIT;
