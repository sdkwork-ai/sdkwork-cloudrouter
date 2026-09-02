-- sdkwork:migration
-- id: 0038_ai_routing_policy_profile_rule
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Materialize the routing decision-plane tables (`ai_routing_policy`,
--   `ai_routing_profile`, `ai_routing_rule`) on installs whose baseline was
--   applied before these tables joined the baseline contract. The baseline DDL
--   is only applied once, so existing databases never receive tables that were
--   later added to it; this forward migration closes that gap for upgrades and
--   is a no-op (IF NOT EXISTS) on fresh installs.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

CREATE TABLE IF NOT EXISTS ai_routing_policy (
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
    policy_code VARCHAR(64) NOT NULL,
    name VARCHAR(128),
    policy_scope INTEGER,
    subject_id BIGINT,
    capability INTEGER,
    default_profile_id BIGINT,
    fallback_mode INTEGER,
    slo_latency_ms INTEGER,
    slo_success_rate NUMERIC(38, 12),
    cost_ceiling NUMERIC(38, 12),
    currency VARCHAR(10),
    CONSTRAINT ck_ai_routing_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_routing_policy_non_negative_limits CHECK ((slo_latency_ms IS NULL OR slo_latency_ms >= 0) AND (cost_ceiling IS NULL OR cost_ceiling >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_tenant_code ON ai_routing_policy (tenant_id, organization_id, policy_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_scope_id ON ai_routing_policy (tenant_id, organization_id, id);

CREATE TABLE IF NOT EXISTS ai_routing_profile (
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
    policy_id BIGINT NOT NULL,
    profile_version BIGINT NOT NULL,
    profile_name VARCHAR(128),
    release_status INTEGER,
    traffic_percent NUMERIC(38, 12),
    config_hash VARCHAR(128),
    published_at TIMESTAMPTZ,
    published_by BIGINT,
    rollback_from_profile_id BIGINT,
    CONSTRAINT ck_ai_routing_profile_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_routing_profile_policy FOREIGN KEY (tenant_id, organization_id, policy_id) REFERENCES ai_routing_policy (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_routing_profile_version CHECK (profile_version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_policy_version ON ai_routing_profile (policy_id, profile_version) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_scope_id ON ai_routing_profile (tenant_id, organization_id, id);

CREATE TABLE IF NOT EXISTS ai_routing_rule (
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
    profile_id BIGINT NOT NULL,
    rule_code VARCHAR(64) NOT NULL,
    priority INTEGER,
    match_expression JSONB,
    target_model VARCHAR(256),
    candidate_account_groups JSONB,
    fallback_chain JSONB,
    constraints JSONB,
    rate_limit_policy_id BIGINT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_routing_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_routing_rule_profile FOREIGN KEY (tenant_id, organization_id, profile_id) REFERENCES ai_routing_profile (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_routing_rule_priority CHECK (priority IS NULL OR priority >= 0),
    CONSTRAINT ck_ai_routing_rule_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_rule_profile_code ON ai_routing_rule (profile_id, rule_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_routing_rule_tenant_profile_priority ON ai_routing_rule (tenant_id, organization_id, profile_id, priority, status);

COMMIT;
