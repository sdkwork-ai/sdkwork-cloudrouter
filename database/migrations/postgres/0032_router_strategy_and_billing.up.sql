-- sdkwork:migration
-- id: 0032_router_strategy_and_billing
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Introduce the unified routing model for the Cloud Router rewrite:
--   - ai_routing_strategy: strategy-pattern routing configuration (price_first,
--     sticky, quality_first, latency_first, weighted, round_robin) referenced by
--     account-group routing_strategy_code.
--   - ai_model_access_policy: unified per-vendor model access (allow/deny) that
--     replaces the previously scattered model_blacklist/model_whitelist JSONB
--     columns on supplier/account/account-group (kept for backward compat).
--   - ai_resource_binding: single resource-authorization table that replaces the
--     three parallel supplier/account-group/account resource bindings; adds the
--     route_kind (model|api) marker that drives model-vs-api routing.
--   - ai_upstream_account.billing_mode: per-account prepay/postpay billing mode.
--   - ai_upstream_account_group.routing_strategy_code: default price_first.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Routing strategy table (strategy pattern registry storage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_routing_strategy (
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
    strategy_code VARCHAR(64) NOT NULL,
    strategy_name VARCHAR(128) NOT NULL,
    strategy_name_i18n JSONB,
    description VARCHAR(512),
    strategy_type VARCHAR(32) NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT ck_ai_routing_strategy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_routing_strategy_type CHECK (strategy_type IN ('price_first', 'sticky', 'quality_first', 'latency_first', 'weighted', 'round_robin') AND priority >= 0),
    CONSTRAINT ck_ai_routing_strategy_params CHECK (jsonb_typeof(params) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_strategy_uuid ON ai_routing_strategy (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_strategy_tenant_code ON ai_routing_strategy (tenant_id, organization_id, strategy_code);
CREATE INDEX IF NOT EXISTS idx_ai_routing_strategy_tenant_status ON ai_routing_strategy (tenant_id, organization_id, status, strategy_type, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_strategy_tenant_default ON ai_routing_strategy (tenant_id, organization_id, is_default, enabled, id);

-- ---------------------------------------------------------------------------
-- 2. Unified model access policy table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_model_access_policy (
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
    scope_type VARCHAR(32) NOT NULL,
    scope_id BIGINT NOT NULL,
    scope_code VARCHAR(64),
    effect VARCHAR(16) NOT NULL,
    vendor_code VARCHAR(64),
    model_pattern VARCHAR(256),
    modalities JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INTEGER NOT NULL DEFAULT 100,
    description VARCHAR(512),
    CONSTRAINT ck_ai_model_access_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_model_access_policy_scope CHECK (scope_type IN ('supplier', 'account_group')),
    CONSTRAINT ck_ai_model_access_policy_effect CHECK (effect IN ('allow', 'deny') AND priority >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_access_policy_uuid ON ai_model_access_policy (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_access_policy_scope_rule ON ai_model_access_policy (tenant_id, organization_id, scope_type, scope_id, effect, vendor_code, model_pattern);
CREATE INDEX IF NOT EXISTS idx_ai_model_access_policy_scope_status ON ai_model_access_policy (tenant_id, organization_id, scope_type, scope_id, status, priority, id);

-- ---------------------------------------------------------------------------
-- 3. Unified resource binding table (model-vs-api route marker)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_resource_binding (
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
    binding_scope VARCHAR(32) NOT NULL,
    supplier_id BIGINT,
    supplier_code VARCHAR(64),
    account_group_id BIGINT,
    account_group_code VARCHAR(64),
    account_id BIGINT,
    account_code VARCHAR(64),
    resource_id BIGINT,
    resource_code VARCHAR(192) NOT NULL,
    resource_group_code VARCHAR(128),
    grant_type VARCHAR(16) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_resource_binding_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_resource_binding_scope CHECK (binding_scope IN ('supplier', 'account_group', 'account')),
    CONSTRAINT ck_ai_resource_binding_grant CHECK (grant_type IN ('allow', 'deny') AND priority >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_resource_binding_uuid ON ai_resource_binding (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_resource_binding_scope_resource ON ai_resource_binding (tenant_id, organization_id, binding_scope, supplier_id, account_group_id, account_id, resource_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_resource_binding_scope_status ON ai_resource_binding (tenant_id, organization_id, binding_scope, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_resource_binding_resource_status ON ai_resource_binding (tenant_id, organization_id, resource_code, status, id);

-- ---------------------------------------------------------------------------
-- 4. Account billing mode (prepay/postpay)
-- ---------------------------------------------------------------------------
ALTER TABLE ai_upstream_account
    ADD COLUMN IF NOT EXISTS billing_mode VARCHAR(32) NOT NULL DEFAULT 'prepay';

-- ---------------------------------------------------------------------------
-- 5. Account-group routing strategy code (default price_first)
-- ---------------------------------------------------------------------------
ALTER TABLE ai_upstream_account_group
    ADD COLUMN IF NOT EXISTS routing_strategy_code VARCHAR(64) NOT NULL DEFAULT 'price_first';

COMMIT;
