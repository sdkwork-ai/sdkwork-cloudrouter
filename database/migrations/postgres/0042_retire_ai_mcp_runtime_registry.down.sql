-- sdkwork:migration
-- id: 0042_retire_ai_mcp_runtime_registry
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the MCP runtime registry retirement for the two tables
--   Cloud Router owns. Re-provisions `ai_mcp_binding` and
--   `ai_mcp_server_revision` in the Cloud Router contract shape so the
--   migration is reversible.
--
--   `ai_mcp_server` and `ai_mcp_tool` are intentionally NOT recreated here:
--   they belong to the sibling `sdkwork-mcp` repository and were never dropped
--   by the up-migration. Recreating them would be a cross-repository write
--   from Cloud Router's ledger.
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

COMMIT;
