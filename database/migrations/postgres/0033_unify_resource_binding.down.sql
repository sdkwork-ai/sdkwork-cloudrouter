-- sdkwork:migration
-- id: 0033_unify_resource_binding
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the unified resource-binding migration (0033).
-- reversible: true
-- rollback: up-migration
-- transactional: true
-- lock: disruptive
-- lock_timeout: 10s
-- statement_timeout: 120s

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Restore model-list columns.
-- ---------------------------------------------------------------------------
ALTER TABLE ai_upstream_account
    ADD COLUMN IF NOT EXISTS model_blacklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS model_whitelist JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS model_blacklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS model_whitelist JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE ai_upstream_supplier
    ADD COLUMN IF NOT EXISTS model_blacklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS model_whitelist JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Recreate legacy resource-binding tables.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_upstream_supplier_resource (
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
    supplier_id BIGINT NOT NULL,
    supplier_code VARCHAR(64),
    resource_id BIGINT,
    resource_code VARCHAR(192),
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128),
    grant_type VARCHAR(16) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_upstream_account_group_resource (
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
    account_group_id BIGINT NOT NULL,
    resource_id BIGINT,
    resource_code VARCHAR(192),
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128),
    grant_type VARCHAR(16) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

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
    resource_code VARCHAR(192),
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128),
    grant_type VARCHAR(16) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- 3. Migrate unified bindings back to the legacy tables.
-- ---------------------------------------------------------------------------
INSERT INTO ai_upstream_supplier_resource (
    id, uuid, tenant_id, organization_id, data_scope, status,
    created_at, updated_at, version, metadata,
    supplier_id, supplier_code, resource_id, resource_code,
    resource_group_id, resource_group_code, grant_type, priority,
    effective_from, effective_to
)
SELECT
    id, uuid, tenant_id, organization_id, data_scope, status,
    created_at, updated_at, version, metadata,
    supplier_id, supplier_code, resource_id, resource_code,
    NULL, resource_group_code, grant_type, priority, effective_from, effective_to
FROM ai_resource_binding
WHERE binding_scope = 'supplier' AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO ai_upstream_account_group_resource (
    id, uuid, tenant_id, organization_id, data_scope, status,
    created_at, updated_at, version, metadata,
    account_group_id, resource_id, resource_code,
    resource_group_id, resource_group_code, grant_type, priority,
    effective_from, effective_to
)
SELECT
    id, uuid, tenant_id, organization_id, data_scope, status,
    created_at, updated_at, version, metadata,
    account_group_id, resource_id, resource_code,
    NULL, resource_group_code, grant_type, priority, effective_from, effective_to
FROM ai_resource_binding
WHERE binding_scope = 'account_group' AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO ai_upstream_account_resource (
    id, uuid, tenant_id, organization_id, data_scope, status,
    created_at, updated_at, version, metadata,
    account_id, resource_id, resource_code,
    resource_group_id, resource_group_code, grant_type, priority,
    effective_from, effective_to
)
SELECT
    id, uuid, tenant_id, organization_id, data_scope, status,
    created_at, updated_at, version, metadata,
    account_id, resource_id, resource_code,
    NULL, resource_group_code, grant_type, priority, effective_from, effective_to
FROM ai_resource_binding
WHERE binding_scope = 'account' AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- Restore the unified table's resource_code NOT NULL and drop the
-- target-exclusivity check added in the up-migration.
ALTER TABLE ai_resource_binding
    DROP CONSTRAINT IF EXISTS ck_ai_resource_binding_target;

ALTER TABLE ai_resource_binding
    ALTER COLUMN resource_code SET NOT NULL;

COMMIT;
