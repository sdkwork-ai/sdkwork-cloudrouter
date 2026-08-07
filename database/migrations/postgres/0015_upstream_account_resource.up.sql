-- 0015_upstream_account_resource.up.sql
-- Adds per-account resource/resource-group bindings so each upstream account can
-- scope which catalog resources it serves, independently of account groups.
--
-- The binding mirrors ai_upstream_account_group_resource: one row binds exactly
-- one resource_code OR one resource_group_code (XOR), with allow/deny grants and
-- optional effective windows. Runtime routing intersects the account scope with
-- the group x supplier scope; accounts without bindings stay unrestricted.

CREATE TABLE IF NOT EXISTS ai_upstream_account_resource (
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
    account_id BIGINT NOT NULL,
    resource_id BIGINT,
    resource_code VARCHAR(192) NOT NULL DEFAULT '',
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128) NOT NULL DEFAULT '',
    grant_type VARCHAR(32) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_upstream_account_resource_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_upstream_account_resource_account FOREIGN KEY (tenant_id, organization_id, account_id) REFERENCES ai_upstream_account (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_upstream_account_resource_target CHECK ((NULLIF(resource_code, '') IS NOT NULL) <> (NULLIF(resource_group_code, '') IS NOT NULL) AND grant_type IN ('allow', 'deny') AND priority >= 0 AND (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_resource_uuid ON ai_upstream_account_resource (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_upstream_account_resource ON ai_upstream_account_resource (tenant_id, organization_id, account_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_resource_status ON ai_upstream_account_resource (tenant_id, organization_id, status, account_id, grant_type, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_upstream_account_resource_lookup ON ai_upstream_account_resource (tenant_id, organization_id, account_id, status, grant_type, priority, id);
