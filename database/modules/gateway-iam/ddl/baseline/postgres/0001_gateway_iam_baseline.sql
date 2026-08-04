-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.
-- Registry version: 0.4.0.
-- Registry SHA-256: 68adaff94451c089d37f4be3b45c66d13b1d93c1f3aa9d2411c48ec4d3cfa03f.
-- Dialect: postgres.
-- Materialize: python -B -m tools.schema_compiler --dialect postgres --materialize.
-- Do not edit by hand; update Schema Registry and regenerate.

CREATE TABLE IF NOT EXISTS iam_gateway_access_policy (
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
    name VARCHAR(128),
    policy_type INTEGER,
    subject_type INTEGER,
    subject_id BIGINT,
    subject_ref_hash VARCHAR(128),
    subject_ref_masked VARCHAR(128),
    allowed_capabilities JSONB,
    denied_capabilities JSONB,
    allowed_models JSONB,
    denied_models JSONB,
    network_policy_mode INTEGER,
    ip_rule_count INTEGER,
    ip_allowlist JSONB,
    ip_denylist JSONB,
    region_allowlist JSONB,
    max_context_tokens BIGINT,
    data_retention_mode INTEGER,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_access_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_tenant_subject_status ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_subject_ref ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key (
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
    user_id BIGINT NOT NULL,
    owner_type INTEGER,
    owner_id BIGINT,
    account_group_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    key_display_masked VARCHAR(64) NOT NULL,
    key_hash VARCHAR(128) NOT NULL,
    hash_alg VARCHAR(32) NOT NULL,
    secret_version BIGINT NOT NULL,
    key_secret_mode VARCHAR(16) NOT NULL DEFAULT 'plaintext',
    key_secret_plaintext TEXT,
    key_secret_ciphertext TEXT,
    key_secret_key_id VARCHAR(64),
    idempotency_key VARCHAR(128) NOT NULL,
    policy_id BIGINT,
    quota_policy_id BIGINT,
    rate_limit_policy_id BIGINT,
    environment INTEGER,
    expire_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_used_ip_hash VARCHAR(128),
    last_used_ip_masked VARCHAR(64),
    last_used_ip_region VARCHAR(128),
    last_revealed_at TIMESTAMPTZ,
    rotated_from_key_id BIGINT,
    revoked_at TIMESTAMPTZ,
    revoked_by BIGINT,
    CONSTRAINT ck_iam_gateway_api_key_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_hash ON iam_gateway_api_key (key_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_idempotency ON iam_gateway_api_key (tenant_id, idempotency_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_scope_id ON iam_gateway_api_key (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_tenant_user_status ON iam_gateway_api_key (tenant_id, organization_id, user_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_ai_account_group_status ON iam_gateway_api_key (tenant_id, organization_id, account_group_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key_account_group (
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
    user_id BIGINT NOT NULL,
    owner_type INTEGER,
    owner_id BIGINT,
    api_key_id BIGINT NOT NULL DEFAULT 0,
    account_group_id BIGINT NOT NULL DEFAULT 0,
    account_group_code VARCHAR(64),
    binding_role VARCHAR(32) NOT NULL DEFAULT 'route',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'auto',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_api_key_account_group_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_iam_gateway_api_key_account_group_api_key FOREIGN KEY (tenant_id, organization_id, api_key_id) REFERENCES iam_gateway_api_key (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_iam_gateway_api_key_account_group_ids CHECK (api_key_id > 0 AND account_group_id > 0),
    CONSTRAINT ck_iam_gateway_api_key_account_group_weighting CHECK (priority >= 0 AND weight >= 0),
    CONSTRAINT ck_iam_gateway_api_key_account_group_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_account_group_uuid ON iam_gateway_api_key_account_group (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_account_group_binding ON iam_gateway_api_key_account_group (tenant_id, organization_id, api_key_id, account_group_id, binding_role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_account_group_active ON iam_gateway_api_key_account_group (tenant_id, organization_id, api_key_id, status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_account_group_group ON iam_gateway_api_key_account_group (tenant_id, organization_id, account_group_id, status, priority, id);

CREATE TABLE IF NOT EXISTS iam_gateway_risk_rule (
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
    rule_name VARCHAR(128),
    rule_category INTEGER,
    rule_type INTEGER,
    scope_type INTEGER,
    scope_id BIGINT,
    target_type INTEGER,
    target_value VARCHAR(256),
    target_value_hash VARCHAR(128),
    target_value_masked VARCHAR(128),
    target_value_cipher_ref VARCHAR(256),
    match_mode INTEGER,
    reason VARCHAR(512),
    action INTEGER,
    priority INTEGER,
    requests_per_second BIGINT,
    requests_per_minute BIGINT,
    requests_per_day BIGINT,
    tokens_per_minute BIGINT,
    burst_limit NUMERIC(38, 12),
    block_duration_seconds BIGINT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    hit_count BIGINT,
    last_hit_at TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_risk_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_risk_rule_tenant_target ON iam_gateway_risk_rule (tenant_id, organization_id, rule_type, target_type, target_value) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_scope_priority ON iam_gateway_risk_rule (tenant_id, organization_id, rule_category, scope_type, scope_id, priority, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_target_hash ON iam_gateway_risk_rule (tenant_id, organization_id, target_type, target_value_hash, status);
