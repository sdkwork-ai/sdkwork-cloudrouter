-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.
-- Registry version: 0.3.0.
-- Registry SHA-256: e488b562ba6285144585ad352ade6bca9b3c5699af75a79e591c61f24b391cfb.
-- Dialect: sqlite.
-- Materialize: python -B -m tools.schema_compiler --dialect all --materialize.
-- Do not edit by hand; update Schema Registry and regenerate.

CREATE TABLE IF NOT EXISTS ai_channel (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    provider_id INTEGER,
    provider_code VARCHAR(64),
    site_id INTEGER,
    site_service_id INTEGER,
    site_code VARCHAR(64),
    site_service_code VARCHAR(64),
    site_channel_role VARCHAR(32),
    channel_code VARCHAR(64) NOT NULL,
    channel_name VARCHAR(128) NOT NULL,
    channel_type VARCHAR(32) NOT NULL,
    protocol_code VARCHAR(64),
    auth_type INTEGER,
    credential_profile INTEGER,
    external_channel_id VARCHAR(128),
    base_url VARCHAR(512),
    auth_config TEXT,
    credential_ref VARCHAR(256),
    credential_hash VARCHAR(128),
    credential_version INTEGER,
    credential_rotation_policy TEXT,
    credential_rotation_strategy VARCHAR(64) NOT NULL DEFAULT 'default',
    masked_label VARCHAR(128),
    environment INTEGER,
    region_code VARCHAR(64),
    quota_unit INTEGER,
    quota_limit TEXT,
    quota_used TEXT,
    upstream_balance_amount TEXT,
    upstream_balance_currency VARCHAR(10),
    last_balance_checked_at TEXT,
    last_rotated_at TEXT,
    next_rotate_at TEXT,
    last_verified_at TEXT,
    last_used_at TEXT,
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    rpm_limit INTEGER,
    timeout_ms INTEGER,
    retry_policy TEXT,
    circuit_breaker_policy TEXT,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count INTEGER,
    proxy_id INTEGER,
    risk_level INTEGER,
    CONSTRAINT ck_ai_channel_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_channel_quota_limit_decimal CHECK (quota_limit IS NULL OR (typeof(quota_limit) = 'text' AND length(quota_limit) BETWEEN 1 AND 40 AND quota_limit NOT GLOB '*[^0-9.-]*' AND quota_limit GLOB '*[0-9]*' AND (instr(quota_limit, '-') = 0 OR (substr(quota_limit, 1, 1) = '-' AND instr(substr(quota_limit, 2), '-') = 0)) AND length(quota_limit) - length(replace(quota_limit, '.', '')) <= 1 AND substr(ltrim(quota_limit, '-'), 1, 1) <> '.' AND substr(quota_limit, -1, 1) <> '.' AND length(replace(replace(quota_limit, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(quota_limit, '.') = 0 THEN 0 ELSE length(quota_limit) - instr(quota_limit, '.') END <= 12 AND (length(ltrim(quota_limit, '-')) = 1 OR substr(ltrim(quota_limit, '-'), 1, 1) <> '0' OR substr(ltrim(quota_limit, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_channel_quota_used_decimal CHECK (quota_used IS NULL OR (typeof(quota_used) = 'text' AND length(quota_used) BETWEEN 1 AND 40 AND quota_used NOT GLOB '*[^0-9.-]*' AND quota_used GLOB '*[0-9]*' AND (instr(quota_used, '-') = 0 OR (substr(quota_used, 1, 1) = '-' AND instr(substr(quota_used, 2), '-') = 0)) AND length(quota_used) - length(replace(quota_used, '.', '')) <= 1 AND substr(ltrim(quota_used, '-'), 1, 1) <> '.' AND substr(quota_used, -1, 1) <> '.' AND length(replace(replace(quota_used, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(quota_used, '.') = 0 THEN 0 ELSE length(quota_used) - instr(quota_used, '.') END <= 12 AND (length(ltrim(quota_used, '-')) = 1 OR substr(ltrim(quota_used, '-'), 1, 1) <> '0' OR substr(ltrim(quota_used, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_channel_upstream_balance_amount_decimal CHECK (upstream_balance_amount IS NULL OR (typeof(upstream_balance_amount) = 'text' AND length(upstream_balance_amount) BETWEEN 1 AND 40 AND upstream_balance_amount NOT GLOB '*[^0-9.-]*' AND upstream_balance_amount GLOB '*[0-9]*' AND (instr(upstream_balance_amount, '-') = 0 OR (substr(upstream_balance_amount, 1, 1) = '-' AND instr(substr(upstream_balance_amount, 2), '-') = 0)) AND length(upstream_balance_amount) - length(replace(upstream_balance_amount, '.', '')) <= 1 AND substr(ltrim(upstream_balance_amount, '-'), 1, 1) <> '.' AND substr(upstream_balance_amount, -1, 1) <> '.' AND length(replace(replace(upstream_balance_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(upstream_balance_amount, '.') = 0 THEN 0 ELSE length(upstream_balance_amount) - instr(upstream_balance_amount, '.') END <= 12 AND (length(ltrim(upstream_balance_amount, '-')) = 1 OR substr(ltrim(upstream_balance_amount, '-'), 1, 1) <> '0' OR substr(ltrim(upstream_balance_amount, '-'), 2, 1) = '.')))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_uuid ON ai_channel (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_tenant_code ON ai_channel (tenant_id, organization_id, channel_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_scope_id ON ai_channel (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_provider_type_status ON ai_channel (tenant_id, organization_id, provider_code, channel_type, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_health_status ON ai_channel (tenant_id, organization_id, status, health_status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_site_status ON ai_channel (tenant_id, organization_id, site_id, status, health_status, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_site_service_status ON ai_channel (tenant_id, organization_id, site_service_id, status, health_status, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_site_code ON ai_channel (tenant_id, organization_id, site_code, site_service_code, status, id);

CREATE TABLE IF NOT EXISTS ai_channel_credential (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    channel_id INTEGER NOT NULL,
    provider_code VARCHAR(64),
    channel_code VARCHAR(64),
    credential_name VARCHAR(128) NOT NULL,
    base_url VARCHAR(512) NOT NULL,
    auth_config TEXT NOT NULL DEFAULT '{}',
    credential_ref VARCHAR(256) NOT NULL,
    credential_hash VARCHAR(128) NOT NULL,
    masked_label VARCHAR(128),
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count INTEGER NOT NULL DEFAULT 0,
    last_verified_at TEXT,
    last_used_at TEXT,
    CONSTRAINT ck_ai_channel_credential_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_credential_uuid ON ai_channel_credential (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_channel_credential_channel ON ai_channel_credential (tenant_id, organization_id, channel_id, status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_credential_ref ON ai_channel_credential (tenant_id, organization_id, credential_ref);

CREATE TABLE IF NOT EXISTS ai_channel_group (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    group_code VARCHAR(64) NOT NULL,
    group_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    provider_code VARCHAR(64),
    group_type VARCHAR(32),
    routing_policy_id INTEGER,
    quota_policy_id INTEGER,
    rate_limit_policy_id INTEGER,
    environment INTEGER,
    pricing_plan_id INTEGER,
    pricing_plan_code VARCHAR(64),
    rate_multiplier TEXT,
    price_reference_mode INTEGER,
    official_price_multiplier TEXT,
    billing_type INTEGER,
    capacity_limit INTEGER,
    allowed_origin TEXT,
    CONSTRAINT ck_ai_channel_group_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_channel_group_rate_multiplier_decimal CHECK (rate_multiplier IS NULL OR (typeof(rate_multiplier) = 'text' AND length(rate_multiplier) BETWEEN 1 AND 40 AND rate_multiplier NOT GLOB '*[^0-9.-]*' AND rate_multiplier GLOB '*[0-9]*' AND (instr(rate_multiplier, '-') = 0 OR (substr(rate_multiplier, 1, 1) = '-' AND instr(substr(rate_multiplier, 2), '-') = 0)) AND length(rate_multiplier) - length(replace(rate_multiplier, '.', '')) <= 1 AND substr(ltrim(rate_multiplier, '-'), 1, 1) <> '.' AND substr(rate_multiplier, -1, 1) <> '.' AND length(replace(replace(rate_multiplier, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(rate_multiplier, '.') = 0 THEN 0 ELSE length(rate_multiplier) - instr(rate_multiplier, '.') END <= 12 AND (length(ltrim(rate_multiplier, '-')) = 1 OR substr(ltrim(rate_multiplier, '-'), 1, 1) <> '0' OR substr(ltrim(rate_multiplier, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_channel_group_official_price_multiplier_decimal CHECK (official_price_multiplier IS NULL OR (typeof(official_price_multiplier) = 'text' AND length(official_price_multiplier) BETWEEN 1 AND 40 AND official_price_multiplier NOT GLOB '*[^0-9.-]*' AND official_price_multiplier GLOB '*[0-9]*' AND (instr(official_price_multiplier, '-') = 0 OR (substr(official_price_multiplier, 1, 1) = '-' AND instr(substr(official_price_multiplier, 2), '-') = 0)) AND length(official_price_multiplier) - length(replace(official_price_multiplier, '.', '')) <= 1 AND substr(ltrim(official_price_multiplier, '-'), 1, 1) <> '.' AND substr(official_price_multiplier, -1, 1) <> '.' AND length(replace(replace(official_price_multiplier, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(official_price_multiplier, '.') = 0 THEN 0 ELSE length(official_price_multiplier) - instr(official_price_multiplier, '.') END <= 12 AND (length(ltrim(official_price_multiplier, '-')) = 1 OR substr(ltrim(official_price_multiplier, '-'), 1, 1) <> '0' OR substr(ltrim(official_price_multiplier, '-'), 2, 1) = '.')))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_uuid ON ai_channel_group (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_tenant_code ON ai_channel_group (tenant_id, organization_id, group_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_scope_id ON ai_channel_group (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_provider_status ON ai_channel_group (tenant_id, organization_id, provider_code, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_tenant_status_updated ON ai_channel_group (tenant_id, organization_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_pricing ON ai_channel_group (tenant_id, organization_id, pricing_plan_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS ai_channel_group_member (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    channel_group_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    enabled INTEGER NOT NULL DEFAULT TRUE,
    effective_from TEXT,
    effective_to TEXT,
    CONSTRAINT ck_ai_channel_group_member_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_channel_group_member_group FOREIGN KEY (tenant_id, organization_id, channel_group_id) REFERENCES ai_channel_group (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_ai_channel_group_member_channel FOREIGN KEY (tenant_id, organization_id, channel_id) REFERENCES ai_channel (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_channel_group_member_non_negative_weighting CHECK (priority >= 0 AND weight >= 0),
    CONSTRAINT ck_ai_channel_group_member_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_member_uuid ON ai_channel_group_member (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_member ON ai_channel_group_member (tenant_id, organization_id, channel_group_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_member_status ON ai_channel_group_member (tenant_id, organization_id, status, channel_group_id, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_member_group ON ai_channel_group_member (tenant_id, organization_id, channel_group_id, status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_member_channel ON ai_channel_group_member (tenant_id, organization_id, channel_id, status, id);

CREATE TABLE IF NOT EXISTS ai_channel_group_metric_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    source_type TEXT,
    source_id INTEGER,
    source_version INTEGER NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}',
    channel_group_id INTEGER NOT NULL,
    group_code VARCHAR(64),
    provider_code VARCHAR(64),
    channel_available_count INTEGER,
    channel_total_count INTEGER,
    capacity_used TEXT,
    capacity_limit TEXT,
    request_count_today INTEGER,
    request_count_total INTEGER,
    usage_amount_today TEXT,
    usage_amount_total TEXT,
    health_status INTEGER,
    snapshot_at TEXT NOT NULL,
    CONSTRAINT ck_ai_channel_group_metric_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_capacity_used_decimal CHECK (capacity_used IS NULL OR (typeof(capacity_used) = 'text' AND length(capacity_used) BETWEEN 1 AND 40 AND capacity_used NOT GLOB '*[^0-9.-]*' AND capacity_used GLOB '*[0-9]*' AND (instr(capacity_used, '-') = 0 OR (substr(capacity_used, 1, 1) = '-' AND instr(substr(capacity_used, 2), '-') = 0)) AND length(capacity_used) - length(replace(capacity_used, '.', '')) <= 1 AND substr(ltrim(capacity_used, '-'), 1, 1) <> '.' AND substr(capacity_used, -1, 1) <> '.' AND length(replace(replace(capacity_used, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(capacity_used, '.') = 0 THEN 0 ELSE length(capacity_used) - instr(capacity_used, '.') END <= 12 AND (length(ltrim(capacity_used, '-')) = 1 OR substr(ltrim(capacity_used, '-'), 1, 1) <> '0' OR substr(ltrim(capacity_used, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_capacity_limit_decimal CHECK (capacity_limit IS NULL OR (typeof(capacity_limit) = 'text' AND length(capacity_limit) BETWEEN 1 AND 40 AND capacity_limit NOT GLOB '*[^0-9.-]*' AND capacity_limit GLOB '*[0-9]*' AND (instr(capacity_limit, '-') = 0 OR (substr(capacity_limit, 1, 1) = '-' AND instr(substr(capacity_limit, 2), '-') = 0)) AND length(capacity_limit) - length(replace(capacity_limit, '.', '')) <= 1 AND substr(ltrim(capacity_limit, '-'), 1, 1) <> '.' AND substr(capacity_limit, -1, 1) <> '.' AND length(replace(replace(capacity_limit, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(capacity_limit, '.') = 0 THEN 0 ELSE length(capacity_limit) - instr(capacity_limit, '.') END <= 12 AND (length(ltrim(capacity_limit, '-')) = 1 OR substr(ltrim(capacity_limit, '-'), 1, 1) <> '0' OR substr(ltrim(capacity_limit, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_usage_amount_today_decimal CHECK (usage_amount_today IS NULL OR (typeof(usage_amount_today) = 'text' AND length(usage_amount_today) BETWEEN 1 AND 40 AND usage_amount_today NOT GLOB '*[^0-9.-]*' AND usage_amount_today GLOB '*[0-9]*' AND (instr(usage_amount_today, '-') = 0 OR (substr(usage_amount_today, 1, 1) = '-' AND instr(substr(usage_amount_today, 2), '-') = 0)) AND length(usage_amount_today) - length(replace(usage_amount_today, '.', '')) <= 1 AND substr(ltrim(usage_amount_today, '-'), 1, 1) <> '.' AND substr(usage_amount_today, -1, 1) <> '.' AND length(replace(replace(usage_amount_today, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(usage_amount_today, '.') = 0 THEN 0 ELSE length(usage_amount_today) - instr(usage_amount_today, '.') END <= 12 AND (length(ltrim(usage_amount_today, '-')) = 1 OR substr(ltrim(usage_amount_today, '-'), 1, 1) <> '0' OR substr(ltrim(usage_amount_today, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_usage_amount_total_decimal CHECK (usage_amount_total IS NULL OR (typeof(usage_amount_total) = 'text' AND length(usage_amount_total) BETWEEN 1 AND 40 AND usage_amount_total NOT GLOB '*[^0-9.-]*' AND usage_amount_total GLOB '*[0-9]*' AND (instr(usage_amount_total, '-') = 0 OR (substr(usage_amount_total, 1, 1) = '-' AND instr(substr(usage_amount_total, 2), '-') = 0)) AND length(usage_amount_total) - length(replace(usage_amount_total, '.', '')) <= 1 AND substr(ltrim(usage_amount_total, '-'), 1, 1) <> '.' AND substr(usage_amount_total, -1, 1) <> '.' AND length(replace(replace(usage_amount_total, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(usage_amount_total, '.') = 0 THEN 0 ELSE length(usage_amount_total) - instr(usage_amount_total, '.') END <= 12 AND (length(ltrim(usage_amount_total, '-')) = 1 OR substr(ltrim(usage_amount_total, '-'), 1, 1) <> '0' OR substr(ltrim(usage_amount_total, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_non_negative_counts CHECK ((channel_available_count IS NULL OR channel_available_count >= 0) AND (channel_total_count IS NULL OR channel_total_count >= 0) AND (request_count_today IS NULL OR request_count_today >= 0) AND (request_count_total IS NULL OR request_count_total >= 0)),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_non_negative_amounts CHECK ((capacity_used IS NULL OR capacity_used >= 0) AND (capacity_limit IS NULL OR capacity_limit >= 0) AND (usage_amount_today IS NULL OR usage_amount_today >= 0) AND (usage_amount_total IS NULL OR usage_amount_total >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_metric_snapshot_uuid ON ai_channel_group_metric_snapshot (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_metric_snapshot ON ai_channel_group_metric_snapshot (tenant_id, organization_id, channel_group_id, snapshot_at);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_metric_tenant_status ON ai_channel_group_metric_snapshot (tenant_id, organization_id, status, snapshot_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_metric_status ON ai_channel_group_metric_snapshot (tenant_id, organization_id, provider_code, health_status, snapshot_at, id);

CREATE TABLE IF NOT EXISTS ai_channel_group_resource (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    channel_group_id INTEGER NOT NULL,
    resource_id INTEGER,
    resource_code VARCHAR(192) NOT NULL DEFAULT '',
    resource_group_id INTEGER,
    resource_group_code VARCHAR(128) NOT NULL DEFAULT '',
    grant_type VARCHAR(32) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TEXT,
    effective_to TEXT,
    CONSTRAINT ck_ai_channel_group_resource_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_resource_uuid ON ai_channel_group_resource (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_resource ON ai_channel_group_resource (tenant_id, organization_id, channel_group_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_resource_status ON ai_channel_group_resource (tenant_id, organization_id, status, channel_group_id, grant_type, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_resource_lookup ON ai_channel_group_resource (tenant_id, organization_id, channel_group_id, status, grant_type, priority, id);

CREATE TABLE IF NOT EXISTS ai_channel_resource (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    channel_id INTEGER NOT NULL,
    provider_code VARCHAR(64),
    channel_code VARCHAR(64),
    resource_id INTEGER,
    resource_code VARCHAR(192) NOT NULL DEFAULT '',
    resource_group_id INTEGER,
    resource_group_code VARCHAR(128) NOT NULL DEFAULT '',
    grant_type VARCHAR(32) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TEXT,
    effective_to TEXT,
    CONSTRAINT ck_ai_channel_resource_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_resource_uuid ON ai_channel_resource (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_resource ON ai_channel_resource (tenant_id, organization_id, channel_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_channel_resource_lookup ON ai_channel_resource (tenant_id, organization_id, status, channel_id, grant_type, priority, id);

CREATE TABLE IF NOT EXISTS ai_config_change_event (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    config_scope VARCHAR(64) NOT NULL,
    changed_object_type VARCHAR(64),
    changed_object_id INTEGER,
    config_version INTEGER NOT NULL,
    event_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    event_payload TEXT,
    published_at TEXT,
    publish_attempts INTEGER NOT NULL DEFAULT 0,
    last_error_message VARCHAR(512),
    CONSTRAINT ck_ai_config_change_event_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_change_event_uuid ON ai_config_change_event (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_pending ON ai_config_change_event (tenant_id, organization_id, event_status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_scope_version ON ai_config_change_event (tenant_id, organization_id, config_scope, config_version, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_retention ON ai_config_change_event (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_config_version (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    config_scope VARCHAR(64) NOT NULL,
    config_version INTEGER NOT NULL DEFAULT 0,
    changed_object_type VARCHAR(64),
    changed_object_id INTEGER,
    published_at TEXT,
    CONSTRAINT ck_ai_config_version_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_version_uuid ON ai_config_version (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_version_scope ON ai_config_version (tenant_id, organization_id, config_scope);
CREATE INDEX IF NOT EXISTS idx_ai_config_version_scope_updated ON ai_config_version (tenant_id, organization_id, config_scope, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_version_scope_status ON ai_config_version (config_scope, status, deleted_at, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    source_vendor_id INTEGER,
    source_vendor_code VARCHAR(64) NOT NULL DEFAULT '',
    target_vendor_id INTEGER,
    target_vendor_code VARCHAR(64) NOT NULL DEFAULT '',
    mapping_mode VARCHAR(32) NOT NULL DEFAULT 'alias',
    match_type VARCHAR(32) NOT NULL DEFAULT 'exact',
    enabled INTEGER NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_uuid ON ai_model_mapping_rule (uuid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_source_vendor ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, source_vendor_code, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_target_vendor ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, target_vendor_code, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_enabled ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule_binding (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    rule_id INTEGER NOT NULL DEFAULT 0,
    rule_uuid VARCHAR(128),
    binding_type VARCHAR(32) NOT NULL DEFAULT 'global',
    binding_id INTEGER,
    binding_code VARCHAR(128),
    binding_name_snapshot VARCHAR(256),
    sort_order INTEGER NOT NULL DEFAULT 100,
    enabled INTEGER NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_binding_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_binding_uuid ON ai_model_mapping_rule_binding (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_binding_target ON ai_model_mapping_rule_binding (tenant_id, organization_id, rule_id, binding_type, binding_id, binding_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_rule_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, rule_id, status, enabled, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_target_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, binding_id, binding_code, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_channel_group_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, binding_code, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_vendor_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, binding_code, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_binding_global_lookup ON ai_model_mapping_rule_binding (tenant_id, organization_id, binding_type, status, enabled, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule_item (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    rule_id INTEGER NOT NULL DEFAULT 0,
    rule_uuid VARCHAR(128),
    source_model VARCHAR(256) NOT NULL DEFAULT '',
    source_catalog_key VARCHAR(256),
    target_model VARCHAR(256) NOT NULL DEFAULT '',
    target_catalog_key VARCHAR(256),
    target_provider_model VARCHAR(256),
    target_provider_native_model VARCHAR(256),
    sort_order INTEGER NOT NULL DEFAULT 100,
    enabled INTEGER NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_item_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_item_uuid ON ai_model_mapping_rule_item (uuid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_rule_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, rule_id, status, enabled, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_source_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, source_model, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_target_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, target_catalog_key, target_model, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing_import_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    import_source INTEGER NOT NULL,
    source_name VARCHAR(128) NOT NULL,
    source_url VARCHAR(1024),
    source_version VARCHAR(128),
    source_hash VARCHAR(128) NOT NULL,
    upstream_commit VARCHAR(128),
    data_format VARCHAR(64),
    row_count INTEGER,
    accepted_count INTEGER,
    rejected_count INTEGER,
    currency VARCHAR(10),
    published_at TEXT,
    observed_at TEXT NOT NULL,
    raw_payload_ref VARCHAR(512),
    normalized_payload_hash VARCHAR(128),
    schema_version VARCHAR(32),
    error_message_masked VARCHAR(1024),
    CONSTRAINT ck_ai_pricing_import_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_import_snapshot_uuid ON ai_pricing_import_snapshot (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_import_snapshot_hash ON ai_pricing_import_snapshot (tenant_id, organization_id, import_source, source_hash);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_import_snapshot_tenant_latest ON ai_pricing_import_snapshot (tenant_id, organization_id, status, import_source, observed_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_import_snapshot_retention ON ai_pricing_import_snapshot (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_pricing_plan (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    plan_code VARCHAR(64) NOT NULL,
    plan_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    plan_scope INTEGER,
    base_price_side INTEGER NOT NULL,
    base_pricing_scope INTEGER,
    default_reference_price_id INTEGER,
    default_multiplier TEXT,
    default_markup_amount TEXT,
    currency VARCHAR(10) NOT NULL,
    billing_mode INTEGER,
    rounding_mode INTEGER,
    min_charge_amount TEXT,
    fallback_mode INTEGER,
    priority INTEGER,
    price_version VARCHAR(64),
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    CONSTRAINT ck_ai_pricing_plan_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_pricing_plan_default_multiplier_decimal CHECK (default_multiplier IS NULL OR (typeof(default_multiplier) = 'text' AND length(default_multiplier) BETWEEN 1 AND 40 AND default_multiplier NOT GLOB '*[^0-9.-]*' AND default_multiplier GLOB '*[0-9]*' AND (instr(default_multiplier, '-') = 0 OR (substr(default_multiplier, 1, 1) = '-' AND instr(substr(default_multiplier, 2), '-') = 0)) AND length(default_multiplier) - length(replace(default_multiplier, '.', '')) <= 1 AND substr(ltrim(default_multiplier, '-'), 1, 1) <> '.' AND substr(default_multiplier, -1, 1) <> '.' AND length(replace(replace(default_multiplier, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(default_multiplier, '.') = 0 THEN 0 ELSE length(default_multiplier) - instr(default_multiplier, '.') END <= 12 AND (length(ltrim(default_multiplier, '-')) = 1 OR substr(ltrim(default_multiplier, '-'), 1, 1) <> '0' OR substr(ltrim(default_multiplier, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_plan_default_markup_amount_decimal CHECK (default_markup_amount IS NULL OR (typeof(default_markup_amount) = 'text' AND length(default_markup_amount) BETWEEN 1 AND 40 AND default_markup_amount NOT GLOB '*[^0-9.-]*' AND default_markup_amount GLOB '*[0-9]*' AND (instr(default_markup_amount, '-') = 0 OR (substr(default_markup_amount, 1, 1) = '-' AND instr(substr(default_markup_amount, 2), '-') = 0)) AND length(default_markup_amount) - length(replace(default_markup_amount, '.', '')) <= 1 AND substr(ltrim(default_markup_amount, '-'), 1, 1) <> '.' AND substr(default_markup_amount, -1, 1) <> '.' AND length(replace(replace(default_markup_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(default_markup_amount, '.') = 0 THEN 0 ELSE length(default_markup_amount) - instr(default_markup_amount, '.') END <= 12 AND (length(ltrim(default_markup_amount, '-')) = 1 OR substr(ltrim(default_markup_amount, '-'), 1, 1) <> '0' OR substr(ltrim(default_markup_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_plan_min_charge_amount_decimal CHECK (min_charge_amount IS NULL OR (typeof(min_charge_amount) = 'text' AND length(min_charge_amount) BETWEEN 1 AND 40 AND min_charge_amount NOT GLOB '*[^0-9.-]*' AND min_charge_amount GLOB '*[0-9]*' AND (instr(min_charge_amount, '-') = 0 OR (substr(min_charge_amount, 1, 1) = '-' AND instr(substr(min_charge_amount, 2), '-') = 0)) AND length(min_charge_amount) - length(replace(min_charge_amount, '.', '')) <= 1 AND substr(ltrim(min_charge_amount, '-'), 1, 1) <> '.' AND substr(min_charge_amount, -1, 1) <> '.' AND length(replace(replace(min_charge_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(min_charge_amount, '.') = 0 THEN 0 ELSE length(min_charge_amount) - instr(min_charge_amount, '.') END <= 12 AND (length(ltrim(min_charge_amount, '-')) = 1 OR substr(ltrim(min_charge_amount, '-'), 1, 1) <> '0' OR substr(ltrim(min_charge_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_plan_non_negative_amounts CHECK ((default_multiplier IS NULL OR default_multiplier >= 0) AND (default_markup_amount IS NULL OR default_markup_amount >= 0) AND (min_charge_amount IS NULL OR min_charge_amount >= 0)),
    CONSTRAINT ck_ai_pricing_plan_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_uuid ON ai_pricing_plan (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_tenant_code ON ai_pricing_plan (tenant_id, organization_id, plan_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_scope_id ON ai_pricing_plan (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_scope_status ON ai_pricing_plan (tenant_id, organization_id, plan_scope, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_effective ON ai_pricing_plan (tenant_id, organization_id, status, effective_from, effective_to, id);

CREATE TABLE IF NOT EXISTS ai_pricing_plan_binding (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    pricing_plan_id INTEGER NOT NULL,
    pricing_plan_code VARCHAR(64),
    subject_type INTEGER NOT NULL,
    subject_id INTEGER,
    subject_code VARCHAR(128),
    binding_source INTEGER,
    multiplier_override TEXT,
    rpm_override INTEGER,
    tpm_override INTEGER,
    quota_policy_id INTEGER,
    priority INTEGER NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    CONSTRAINT ck_ai_pricing_plan_binding_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_pricing_plan_binding_multiplier_override_decimal CHECK (multiplier_override IS NULL OR (typeof(multiplier_override) = 'text' AND length(multiplier_override) BETWEEN 1 AND 40 AND multiplier_override NOT GLOB '*[^0-9.-]*' AND multiplier_override GLOB '*[0-9]*' AND (instr(multiplier_override, '-') = 0 OR (substr(multiplier_override, 1, 1) = '-' AND instr(substr(multiplier_override, 2), '-') = 0)) AND length(multiplier_override) - length(replace(multiplier_override, '.', '')) <= 1 AND substr(ltrim(multiplier_override, '-'), 1, 1) <> '.' AND substr(multiplier_override, -1, 1) <> '.' AND length(replace(replace(multiplier_override, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(multiplier_override, '.') = 0 THEN 0 ELSE length(multiplier_override) - instr(multiplier_override, '.') END <= 12 AND (length(ltrim(multiplier_override, '-')) = 1 OR substr(ltrim(multiplier_override, '-'), 1, 1) <> '0' OR substr(ltrim(multiplier_override, '-'), 2, 1) = '.')))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_uuid ON ai_pricing_plan_binding (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_subject ON ai_pricing_plan_binding (tenant_id, organization_id, subject_type, subject_id, pricing_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_tenant_status_effective ON ai_pricing_plan_binding (tenant_id, organization_id, status, effective_from, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_subject_effective ON ai_pricing_plan_binding (tenant_id, organization_id, subject_type, subject_id, status, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_plan ON ai_pricing_plan_binding (tenant_id, organization_id, pricing_plan_id, status, priority, id);

CREATE TABLE IF NOT EXISTS ai_pricing_rule (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    pricing_plan_id INTEGER NOT NULL,
    pricing_plan_code VARCHAR(64),
    rule_code VARCHAR(64) NOT NULL,
    rule_name VARCHAR(128),
    match_type INTEGER,
    vendor_code VARCHAR(64),
    family_code VARCHAR(64),
    model_id INTEGER,
    model VARCHAR(256),
    provider_code VARCHAR(64),
    channel_id INTEGER,
    provider_model VARCHAR(256),
    capability_code VARCHAR(64),
    platform_code VARCHAR(64),
    service_tier VARCHAR(64),
    region VARCHAR(64),
    price_side INTEGER,
    reference_price_side INTEGER,
    reference_pricing_id INTEGER,
    reference_pricing_scope INTEGER,
    price_item_type INTEGER,
    billing_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id INTEGER,
    billing_meter_code VARCHAR(64) NOT NULL,
    unit INTEGER,
    unit_size TEXT,
    metering_mode INTEGER,
    quantity_source INTEGER,
    quantity_formula TEXT,
    result_selector VARCHAR(256),
    minimum_quantity TEXT,
    quantity_step TEXT,
    included_quantity TEXT,
    formula_mode INTEGER NOT NULL,
    multiplier TEXT,
    markup_amount TEXT,
    unit_price_override TEXT,
    expression TEXT,
    expression_hash VARCHAR(128),
    fallback_mode INTEGER,
    priority INTEGER NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    CONSTRAINT ck_ai_pricing_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_pricing_rule_unit_size_decimal CHECK (unit_size IS NULL OR (typeof(unit_size) = 'text' AND length(unit_size) BETWEEN 1 AND 40 AND unit_size NOT GLOB '*[^0-9.-]*' AND unit_size GLOB '*[0-9]*' AND (instr(unit_size, '-') = 0 OR (substr(unit_size, 1, 1) = '-' AND instr(substr(unit_size, 2), '-') = 0)) AND length(unit_size) - length(replace(unit_size, '.', '')) <= 1 AND substr(ltrim(unit_size, '-'), 1, 1) <> '.' AND substr(unit_size, -1, 1) <> '.' AND length(replace(replace(unit_size, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(unit_size, '.') = 0 THEN 0 ELSE length(unit_size) - instr(unit_size, '.') END <= 12 AND (length(ltrim(unit_size, '-')) = 1 OR substr(ltrim(unit_size, '-'), 1, 1) <> '0' OR substr(ltrim(unit_size, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_rule_minimum_quantity_decimal CHECK (minimum_quantity IS NULL OR (typeof(minimum_quantity) = 'text' AND length(minimum_quantity) BETWEEN 1 AND 40 AND minimum_quantity NOT GLOB '*[^0-9.-]*' AND minimum_quantity GLOB '*[0-9]*' AND (instr(minimum_quantity, '-') = 0 OR (substr(minimum_quantity, 1, 1) = '-' AND instr(substr(minimum_quantity, 2), '-') = 0)) AND length(minimum_quantity) - length(replace(minimum_quantity, '.', '')) <= 1 AND substr(ltrim(minimum_quantity, '-'), 1, 1) <> '.' AND substr(minimum_quantity, -1, 1) <> '.' AND length(replace(replace(minimum_quantity, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(minimum_quantity, '.') = 0 THEN 0 ELSE length(minimum_quantity) - instr(minimum_quantity, '.') END <= 12 AND (length(ltrim(minimum_quantity, '-')) = 1 OR substr(ltrim(minimum_quantity, '-'), 1, 1) <> '0' OR substr(ltrim(minimum_quantity, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_rule_quantity_step_decimal CHECK (quantity_step IS NULL OR (typeof(quantity_step) = 'text' AND length(quantity_step) BETWEEN 1 AND 40 AND quantity_step NOT GLOB '*[^0-9.-]*' AND quantity_step GLOB '*[0-9]*' AND (instr(quantity_step, '-') = 0 OR (substr(quantity_step, 1, 1) = '-' AND instr(substr(quantity_step, 2), '-') = 0)) AND length(quantity_step) - length(replace(quantity_step, '.', '')) <= 1 AND substr(ltrim(quantity_step, '-'), 1, 1) <> '.' AND substr(quantity_step, -1, 1) <> '.' AND length(replace(replace(quantity_step, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(quantity_step, '.') = 0 THEN 0 ELSE length(quantity_step) - instr(quantity_step, '.') END <= 12 AND (length(ltrim(quantity_step, '-')) = 1 OR substr(ltrim(quantity_step, '-'), 1, 1) <> '0' OR substr(ltrim(quantity_step, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_rule_included_quantity_decimal CHECK (included_quantity IS NULL OR (typeof(included_quantity) = 'text' AND length(included_quantity) BETWEEN 1 AND 40 AND included_quantity NOT GLOB '*[^0-9.-]*' AND included_quantity GLOB '*[0-9]*' AND (instr(included_quantity, '-') = 0 OR (substr(included_quantity, 1, 1) = '-' AND instr(substr(included_quantity, 2), '-') = 0)) AND length(included_quantity) - length(replace(included_quantity, '.', '')) <= 1 AND substr(ltrim(included_quantity, '-'), 1, 1) <> '.' AND substr(included_quantity, -1, 1) <> '.' AND length(replace(replace(included_quantity, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(included_quantity, '.') = 0 THEN 0 ELSE length(included_quantity) - instr(included_quantity, '.') END <= 12 AND (length(ltrim(included_quantity, '-')) = 1 OR substr(ltrim(included_quantity, '-'), 1, 1) <> '0' OR substr(ltrim(included_quantity, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_rule_multiplier_decimal CHECK (multiplier IS NULL OR (typeof(multiplier) = 'text' AND length(multiplier) BETWEEN 1 AND 40 AND multiplier NOT GLOB '*[^0-9.-]*' AND multiplier GLOB '*[0-9]*' AND (instr(multiplier, '-') = 0 OR (substr(multiplier, 1, 1) = '-' AND instr(substr(multiplier, 2), '-') = 0)) AND length(multiplier) - length(replace(multiplier, '.', '')) <= 1 AND substr(ltrim(multiplier, '-'), 1, 1) <> '.' AND substr(multiplier, -1, 1) <> '.' AND length(replace(replace(multiplier, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(multiplier, '.') = 0 THEN 0 ELSE length(multiplier) - instr(multiplier, '.') END <= 12 AND (length(ltrim(multiplier, '-')) = 1 OR substr(ltrim(multiplier, '-'), 1, 1) <> '0' OR substr(ltrim(multiplier, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_rule_markup_amount_decimal CHECK (markup_amount IS NULL OR (typeof(markup_amount) = 'text' AND length(markup_amount) BETWEEN 1 AND 40 AND markup_amount NOT GLOB '*[^0-9.-]*' AND markup_amount GLOB '*[0-9]*' AND (instr(markup_amount, '-') = 0 OR (substr(markup_amount, 1, 1) = '-' AND instr(substr(markup_amount, 2), '-') = 0)) AND length(markup_amount) - length(replace(markup_amount, '.', '')) <= 1 AND substr(ltrim(markup_amount, '-'), 1, 1) <> '.' AND substr(markup_amount, -1, 1) <> '.' AND length(replace(replace(markup_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(markup_amount, '.') = 0 THEN 0 ELSE length(markup_amount) - instr(markup_amount, '.') END <= 12 AND (length(ltrim(markup_amount, '-')) = 1 OR substr(ltrim(markup_amount, '-'), 1, 1) <> '0' OR substr(ltrim(markup_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_rule_unit_price_override_decimal CHECK (unit_price_override IS NULL OR (typeof(unit_price_override) = 'text' AND length(unit_price_override) BETWEEN 1 AND 40 AND unit_price_override NOT GLOB '*[^0-9.-]*' AND unit_price_override GLOB '*[0-9]*' AND (instr(unit_price_override, '-') = 0 OR (substr(unit_price_override, 1, 1) = '-' AND instr(substr(unit_price_override, 2), '-') = 0)) AND length(unit_price_override) - length(replace(unit_price_override, '.', '')) <= 1 AND substr(ltrim(unit_price_override, '-'), 1, 1) <> '.' AND substr(unit_price_override, -1, 1) <> '.' AND length(replace(replace(unit_price_override, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(unit_price_override, '.') = 0 THEN 0 ELSE length(unit_price_override) - instr(unit_price_override, '.') END <= 12 AND (length(ltrim(unit_price_override, '-')) = 1 OR substr(ltrim(unit_price_override, '-'), 1, 1) <> '0' OR substr(ltrim(unit_price_override, '-'), 2, 1) = '.'))),
    CONSTRAINT fk_ai_pricing_rule_plan FOREIGN KEY (tenant_id, organization_id, pricing_plan_id) REFERENCES ai_pricing_plan (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_pricing_rule_positive_units CHECK ((unit_size IS NULL OR unit_size > 0) AND (minimum_quantity IS NULL OR minimum_quantity >= 0) AND (quantity_step IS NULL OR quantity_step > 0) AND (included_quantity IS NULL OR included_quantity >= 0)),
    CONSTRAINT ck_ai_pricing_rule_non_negative_amounts CHECK ((multiplier IS NULL OR multiplier >= 0) AND (markup_amount IS NULL OR markup_amount >= 0) AND (unit_price_override IS NULL OR unit_price_override >= 0)),
    CONSTRAINT ck_ai_pricing_rule_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_uuid ON ai_pricing_rule (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_plan_code ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, rule_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_scope_id ON ai_pricing_rule (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_tenant_status_priority ON ai_pricing_rule (tenant_id, organization_id, status, priority, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_model_lookup ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, model, provider_code, channel_id, billing_meter_code, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_meter_lookup ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, billing_meter_code, match_type, status, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_reference ON ai_pricing_rule (tenant_id, organization_id, reference_price_side, reference_pricing_id, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing_tier (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    pricing_rule_id INTEGER NOT NULL,
    model_pricing_id INTEGER,
    tier_code VARCHAR(64) NOT NULL,
    tier_label VARCHAR(64),
    price_item_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id INTEGER,
    billing_meter_code VARCHAR(64) NOT NULL,
    min_quantity TEXT,
    max_quantity TEXT,
    quantity_unit INTEGER,
    quantity_step TEXT,
    included_quantity TEXT,
    result_selector VARCHAR(256),
    input_unit_price TEXT,
    output_unit_price TEXT,
    cache_write_unit_price TEXT,
    cache_read_unit_price TEXT,
    image_unit_price TEXT,
    audio_unit_price TEXT,
    video_unit_price TEXT,
    per_request_price TEXT,
    multiplier TEXT,
    currency VARCHAR(10),
    sort_order INTEGER NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    CONSTRAINT ck_ai_pricing_tier_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_pricing_tier_min_quantity_decimal CHECK (min_quantity IS NULL OR (typeof(min_quantity) = 'text' AND length(min_quantity) BETWEEN 1 AND 40 AND min_quantity NOT GLOB '*[^0-9.-]*' AND min_quantity GLOB '*[0-9]*' AND (instr(min_quantity, '-') = 0 OR (substr(min_quantity, 1, 1) = '-' AND instr(substr(min_quantity, 2), '-') = 0)) AND length(min_quantity) - length(replace(min_quantity, '.', '')) <= 1 AND substr(ltrim(min_quantity, '-'), 1, 1) <> '.' AND substr(min_quantity, -1, 1) <> '.' AND length(replace(replace(min_quantity, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(min_quantity, '.') = 0 THEN 0 ELSE length(min_quantity) - instr(min_quantity, '.') END <= 12 AND (length(ltrim(min_quantity, '-')) = 1 OR substr(ltrim(min_quantity, '-'), 1, 1) <> '0' OR substr(ltrim(min_quantity, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_max_quantity_decimal CHECK (max_quantity IS NULL OR (typeof(max_quantity) = 'text' AND length(max_quantity) BETWEEN 1 AND 40 AND max_quantity NOT GLOB '*[^0-9.-]*' AND max_quantity GLOB '*[0-9]*' AND (instr(max_quantity, '-') = 0 OR (substr(max_quantity, 1, 1) = '-' AND instr(substr(max_quantity, 2), '-') = 0)) AND length(max_quantity) - length(replace(max_quantity, '.', '')) <= 1 AND substr(ltrim(max_quantity, '-'), 1, 1) <> '.' AND substr(max_quantity, -1, 1) <> '.' AND length(replace(replace(max_quantity, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(max_quantity, '.') = 0 THEN 0 ELSE length(max_quantity) - instr(max_quantity, '.') END <= 12 AND (length(ltrim(max_quantity, '-')) = 1 OR substr(ltrim(max_quantity, '-'), 1, 1) <> '0' OR substr(ltrim(max_quantity, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_quantity_step_decimal CHECK (quantity_step IS NULL OR (typeof(quantity_step) = 'text' AND length(quantity_step) BETWEEN 1 AND 40 AND quantity_step NOT GLOB '*[^0-9.-]*' AND quantity_step GLOB '*[0-9]*' AND (instr(quantity_step, '-') = 0 OR (substr(quantity_step, 1, 1) = '-' AND instr(substr(quantity_step, 2), '-') = 0)) AND length(quantity_step) - length(replace(quantity_step, '.', '')) <= 1 AND substr(ltrim(quantity_step, '-'), 1, 1) <> '.' AND substr(quantity_step, -1, 1) <> '.' AND length(replace(replace(quantity_step, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(quantity_step, '.') = 0 THEN 0 ELSE length(quantity_step) - instr(quantity_step, '.') END <= 12 AND (length(ltrim(quantity_step, '-')) = 1 OR substr(ltrim(quantity_step, '-'), 1, 1) <> '0' OR substr(ltrim(quantity_step, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_included_quantity_decimal CHECK (included_quantity IS NULL OR (typeof(included_quantity) = 'text' AND length(included_quantity) BETWEEN 1 AND 40 AND included_quantity NOT GLOB '*[^0-9.-]*' AND included_quantity GLOB '*[0-9]*' AND (instr(included_quantity, '-') = 0 OR (substr(included_quantity, 1, 1) = '-' AND instr(substr(included_quantity, 2), '-') = 0)) AND length(included_quantity) - length(replace(included_quantity, '.', '')) <= 1 AND substr(ltrim(included_quantity, '-'), 1, 1) <> '.' AND substr(included_quantity, -1, 1) <> '.' AND length(replace(replace(included_quantity, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(included_quantity, '.') = 0 THEN 0 ELSE length(included_quantity) - instr(included_quantity, '.') END <= 12 AND (length(ltrim(included_quantity, '-')) = 1 OR substr(ltrim(included_quantity, '-'), 1, 1) <> '0' OR substr(ltrim(included_quantity, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_input_unit_price_decimal CHECK (input_unit_price IS NULL OR (typeof(input_unit_price) = 'text' AND length(input_unit_price) BETWEEN 1 AND 40 AND input_unit_price NOT GLOB '*[^0-9.-]*' AND input_unit_price GLOB '*[0-9]*' AND (instr(input_unit_price, '-') = 0 OR (substr(input_unit_price, 1, 1) = '-' AND instr(substr(input_unit_price, 2), '-') = 0)) AND length(input_unit_price) - length(replace(input_unit_price, '.', '')) <= 1 AND substr(ltrim(input_unit_price, '-'), 1, 1) <> '.' AND substr(input_unit_price, -1, 1) <> '.' AND length(replace(replace(input_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(input_unit_price, '.') = 0 THEN 0 ELSE length(input_unit_price) - instr(input_unit_price, '.') END <= 12 AND (length(ltrim(input_unit_price, '-')) = 1 OR substr(ltrim(input_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(input_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_output_unit_price_decimal CHECK (output_unit_price IS NULL OR (typeof(output_unit_price) = 'text' AND length(output_unit_price) BETWEEN 1 AND 40 AND output_unit_price NOT GLOB '*[^0-9.-]*' AND output_unit_price GLOB '*[0-9]*' AND (instr(output_unit_price, '-') = 0 OR (substr(output_unit_price, 1, 1) = '-' AND instr(substr(output_unit_price, 2), '-') = 0)) AND length(output_unit_price) - length(replace(output_unit_price, '.', '')) <= 1 AND substr(ltrim(output_unit_price, '-'), 1, 1) <> '.' AND substr(output_unit_price, -1, 1) <> '.' AND length(replace(replace(output_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(output_unit_price, '.') = 0 THEN 0 ELSE length(output_unit_price) - instr(output_unit_price, '.') END <= 12 AND (length(ltrim(output_unit_price, '-')) = 1 OR substr(ltrim(output_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(output_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_cache_write_unit_price_decimal CHECK (cache_write_unit_price IS NULL OR (typeof(cache_write_unit_price) = 'text' AND length(cache_write_unit_price) BETWEEN 1 AND 40 AND cache_write_unit_price NOT GLOB '*[^0-9.-]*' AND cache_write_unit_price GLOB '*[0-9]*' AND (instr(cache_write_unit_price, '-') = 0 OR (substr(cache_write_unit_price, 1, 1) = '-' AND instr(substr(cache_write_unit_price, 2), '-') = 0)) AND length(cache_write_unit_price) - length(replace(cache_write_unit_price, '.', '')) <= 1 AND substr(ltrim(cache_write_unit_price, '-'), 1, 1) <> '.' AND substr(cache_write_unit_price, -1, 1) <> '.' AND length(replace(replace(cache_write_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(cache_write_unit_price, '.') = 0 THEN 0 ELSE length(cache_write_unit_price) - instr(cache_write_unit_price, '.') END <= 12 AND (length(ltrim(cache_write_unit_price, '-')) = 1 OR substr(ltrim(cache_write_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(cache_write_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_cache_read_unit_price_decimal CHECK (cache_read_unit_price IS NULL OR (typeof(cache_read_unit_price) = 'text' AND length(cache_read_unit_price) BETWEEN 1 AND 40 AND cache_read_unit_price NOT GLOB '*[^0-9.-]*' AND cache_read_unit_price GLOB '*[0-9]*' AND (instr(cache_read_unit_price, '-') = 0 OR (substr(cache_read_unit_price, 1, 1) = '-' AND instr(substr(cache_read_unit_price, 2), '-') = 0)) AND length(cache_read_unit_price) - length(replace(cache_read_unit_price, '.', '')) <= 1 AND substr(ltrim(cache_read_unit_price, '-'), 1, 1) <> '.' AND substr(cache_read_unit_price, -1, 1) <> '.' AND length(replace(replace(cache_read_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(cache_read_unit_price, '.') = 0 THEN 0 ELSE length(cache_read_unit_price) - instr(cache_read_unit_price, '.') END <= 12 AND (length(ltrim(cache_read_unit_price, '-')) = 1 OR substr(ltrim(cache_read_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(cache_read_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_image_unit_price_decimal CHECK (image_unit_price IS NULL OR (typeof(image_unit_price) = 'text' AND length(image_unit_price) BETWEEN 1 AND 40 AND image_unit_price NOT GLOB '*[^0-9.-]*' AND image_unit_price GLOB '*[0-9]*' AND (instr(image_unit_price, '-') = 0 OR (substr(image_unit_price, 1, 1) = '-' AND instr(substr(image_unit_price, 2), '-') = 0)) AND length(image_unit_price) - length(replace(image_unit_price, '.', '')) <= 1 AND substr(ltrim(image_unit_price, '-'), 1, 1) <> '.' AND substr(image_unit_price, -1, 1) <> '.' AND length(replace(replace(image_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(image_unit_price, '.') = 0 THEN 0 ELSE length(image_unit_price) - instr(image_unit_price, '.') END <= 12 AND (length(ltrim(image_unit_price, '-')) = 1 OR substr(ltrim(image_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(image_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_audio_unit_price_decimal CHECK (audio_unit_price IS NULL OR (typeof(audio_unit_price) = 'text' AND length(audio_unit_price) BETWEEN 1 AND 40 AND audio_unit_price NOT GLOB '*[^0-9.-]*' AND audio_unit_price GLOB '*[0-9]*' AND (instr(audio_unit_price, '-') = 0 OR (substr(audio_unit_price, 1, 1) = '-' AND instr(substr(audio_unit_price, 2), '-') = 0)) AND length(audio_unit_price) - length(replace(audio_unit_price, '.', '')) <= 1 AND substr(ltrim(audio_unit_price, '-'), 1, 1) <> '.' AND substr(audio_unit_price, -1, 1) <> '.' AND length(replace(replace(audio_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(audio_unit_price, '.') = 0 THEN 0 ELSE length(audio_unit_price) - instr(audio_unit_price, '.') END <= 12 AND (length(ltrim(audio_unit_price, '-')) = 1 OR substr(ltrim(audio_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(audio_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_video_unit_price_decimal CHECK (video_unit_price IS NULL OR (typeof(video_unit_price) = 'text' AND length(video_unit_price) BETWEEN 1 AND 40 AND video_unit_price NOT GLOB '*[^0-9.-]*' AND video_unit_price GLOB '*[0-9]*' AND (instr(video_unit_price, '-') = 0 OR (substr(video_unit_price, 1, 1) = '-' AND instr(substr(video_unit_price, 2), '-') = 0)) AND length(video_unit_price) - length(replace(video_unit_price, '.', '')) <= 1 AND substr(ltrim(video_unit_price, '-'), 1, 1) <> '.' AND substr(video_unit_price, -1, 1) <> '.' AND length(replace(replace(video_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(video_unit_price, '.') = 0 THEN 0 ELSE length(video_unit_price) - instr(video_unit_price, '.') END <= 12 AND (length(ltrim(video_unit_price, '-')) = 1 OR substr(ltrim(video_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(video_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_per_request_price_decimal CHECK (per_request_price IS NULL OR (typeof(per_request_price) = 'text' AND length(per_request_price) BETWEEN 1 AND 40 AND per_request_price NOT GLOB '*[^0-9.-]*' AND per_request_price GLOB '*[0-9]*' AND (instr(per_request_price, '-') = 0 OR (substr(per_request_price, 1, 1) = '-' AND instr(substr(per_request_price, 2), '-') = 0)) AND length(per_request_price) - length(replace(per_request_price, '.', '')) <= 1 AND substr(ltrim(per_request_price, '-'), 1, 1) <> '.' AND substr(per_request_price, -1, 1) <> '.' AND length(replace(replace(per_request_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(per_request_price, '.') = 0 THEN 0 ELSE length(per_request_price) - instr(per_request_price, '.') END <= 12 AND (length(ltrim(per_request_price, '-')) = 1 OR substr(ltrim(per_request_price, '-'), 1, 1) <> '0' OR substr(ltrim(per_request_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_pricing_tier_multiplier_decimal CHECK (multiplier IS NULL OR (typeof(multiplier) = 'text' AND length(multiplier) BETWEEN 1 AND 40 AND multiplier NOT GLOB '*[^0-9.-]*' AND multiplier GLOB '*[0-9]*' AND (instr(multiplier, '-') = 0 OR (substr(multiplier, 1, 1) = '-' AND instr(substr(multiplier, 2), '-') = 0)) AND length(multiplier) - length(replace(multiplier, '.', '')) <= 1 AND substr(ltrim(multiplier, '-'), 1, 1) <> '.' AND substr(multiplier, -1, 1) <> '.' AND length(replace(replace(multiplier, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(multiplier, '.') = 0 THEN 0 ELSE length(multiplier) - instr(multiplier, '.') END <= 12 AND (length(ltrim(multiplier, '-')) = 1 OR substr(ltrim(multiplier, '-'), 1, 1) <> '0' OR substr(ltrim(multiplier, '-'), 2, 1) = '.'))),
    CONSTRAINT fk_ai_pricing_tier_rule FOREIGN KEY (tenant_id, organization_id, pricing_rule_id) REFERENCES ai_pricing_rule (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_pricing_tier_quantity_range CHECK ((min_quantity IS NULL OR min_quantity >= 0) AND (max_quantity IS NULL OR max_quantity >= 0) AND (min_quantity IS NULL OR max_quantity IS NULL OR max_quantity >= min_quantity) AND (quantity_step IS NULL OR quantity_step > 0) AND (included_quantity IS NULL OR included_quantity >= 0)),
    CONSTRAINT ck_ai_pricing_tier_non_negative_amounts CHECK ((input_unit_price IS NULL OR input_unit_price >= 0) AND (output_unit_price IS NULL OR output_unit_price >= 0) AND (cache_write_unit_price IS NULL OR cache_write_unit_price >= 0) AND (cache_read_unit_price IS NULL OR cache_read_unit_price >= 0) AND (image_unit_price IS NULL OR image_unit_price >= 0) AND (audio_unit_price IS NULL OR audio_unit_price >= 0) AND (video_unit_price IS NULL OR video_unit_price >= 0) AND (per_request_price IS NULL OR per_request_price >= 0) AND (multiplier IS NULL OR multiplier >= 0)),
    CONSTRAINT ck_ai_pricing_tier_effective_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_tier_uuid ON ai_pricing_tier (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_tier_rule_code ON ai_pricing_tier (tenant_id, organization_id, pricing_rule_id, tier_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tier_tenant_status_effective ON ai_pricing_tier (tenant_id, organization_id, status, effective_from, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tier_rule_range ON ai_pricing_tier (tenant_id, organization_id, pricing_rule_id, billing_meter_code, min_quantity, max_quantity, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tier_model_pricing ON ai_pricing_tier (tenant_id, organization_id, model_pricing_id, price_item_type, sort_order, id);

CREATE TABLE IF NOT EXISTS ai_provider (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    provider_code VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    icon_drive_uri VARCHAR(512),
    icon_resource_snapshot TEXT,
    color_token VARCHAR(64),
    docs_url VARCHAR(512),
    website_url VARCHAR(512),
    default_vendor_code VARCHAR(64),
    provider_type VARCHAR(32),
    protocol_code VARCHAR(64),
    base_url VARCHAR(512),
    auth_type INTEGER,
    resource_schema TEXT,
    metadata_schema_version VARCHAR(32),
    sort_order INTEGER,
    CONSTRAINT ck_ai_provider_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_uuid ON ai_provider (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_tenant_code ON ai_provider (tenant_id, organization_id, provider_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_provider_status_sort ON ai_provider (tenant_id, organization_id, status, sort_order, id);

CREATE TABLE IF NOT EXISTS ai_provider_object_route (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    api_key_id INTEGER,
    channel_group_id INTEGER,
    object_type VARCHAR(64) NOT NULL,
    object_id VARCHAR(256) NOT NULL,
    object_key_hash VARCHAR(128) NOT NULL,
    parent_object_type VARCHAR(64),
    parent_object_id VARCHAR(256),
    provider_code VARCHAR(64),
    channel_id INTEGER NOT NULL,
    vendor_code VARCHAR(64),
    api_code VARCHAR(128),
    catalog_key VARCHAR(256),
    provider_model VARCHAR(256),
    region_code VARCHAR(64),
    sticky_scope VARCHAR(64),
    expires_at TEXT,
    last_seen_at TEXT,
    CONSTRAINT ck_ai_provider_object_route_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_object_route_uuid ON ai_provider_object_route (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_object_route_object ON ai_provider_object_route (tenant_id, organization_id, object_type, object_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_provider_object_route_fast ON ai_provider_object_route (tenant_id, organization_id, object_key_hash, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_object_route_parent ON ai_provider_object_route (tenant_id, organization_id, parent_object_type, parent_object_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_object_route_channel ON ai_provider_object_route (tenant_id, organization_id, channel_group_id, channel_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_object_route_expiry ON ai_provider_object_route (tenant_id, organization_id, expires_at, status, id);

CREATE TABLE IF NOT EXISTS ai_quota_policy (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    policy_code VARCHAR(64),
    name VARCHAR(128),
    subject_type INTEGER,
    subject_id INTEGER,
    subject_ref_hash VARCHAR(128),
    subject_ref_masked VARCHAR(128),
    scope_type INTEGER,
    scope_id INTEGER,
    channel_group_id INTEGER,
    model VARCHAR(256),
    quota_period INTEGER,
    quota_unit INTEGER,
    quota_limit TEXT,
    requests_per_second INTEGER,
    requests_per_minute INTEGER,
    requests_per_day INTEGER,
    tokens_per_minute INTEGER,
    burst_limit TEXT,
    block_duration_seconds INTEGER,
    reset_mode INTEGER,
    exhausted_at TEXT,
    effective_from TEXT,
    effective_to TEXT,
    CONSTRAINT ck_ai_quota_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_quota_policy_quota_limit_decimal CHECK (quota_limit IS NULL OR (typeof(quota_limit) = 'text' AND length(quota_limit) BETWEEN 1 AND 40 AND quota_limit NOT GLOB '*[^0-9.-]*' AND quota_limit GLOB '*[0-9]*' AND (instr(quota_limit, '-') = 0 OR (substr(quota_limit, 1, 1) = '-' AND instr(substr(quota_limit, 2), '-') = 0)) AND length(quota_limit) - length(replace(quota_limit, '.', '')) <= 1 AND substr(ltrim(quota_limit, '-'), 1, 1) <> '.' AND substr(quota_limit, -1, 1) <> '.' AND length(replace(replace(quota_limit, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(quota_limit, '.') = 0 THEN 0 ELSE length(quota_limit) - instr(quota_limit, '.') END <= 12 AND (length(ltrim(quota_limit, '-')) = 1 OR substr(ltrim(quota_limit, '-'), 1, 1) <> '0' OR substr(ltrim(quota_limit, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_quota_policy_burst_limit_decimal CHECK (burst_limit IS NULL OR (typeof(burst_limit) = 'text' AND length(burst_limit) BETWEEN 1 AND 40 AND burst_limit NOT GLOB '*[^0-9.-]*' AND burst_limit GLOB '*[0-9]*' AND (instr(burst_limit, '-') = 0 OR (substr(burst_limit, 1, 1) = '-' AND instr(substr(burst_limit, 2), '-') = 0)) AND length(burst_limit) - length(replace(burst_limit, '.', '')) <= 1 AND substr(ltrim(burst_limit, '-'), 1, 1) <> '.' AND substr(burst_limit, -1, 1) <> '.' AND length(replace(replace(burst_limit, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(burst_limit, '.') = 0 THEN 0 ELSE length(burst_limit) - instr(burst_limit, '.') END <= 12 AND (length(ltrim(burst_limit, '-')) = 1 OR substr(ltrim(burst_limit, '-'), 1, 1) <> '0' OR substr(ltrim(burst_limit, '-'), 2, 1) = '.')))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_quota_policy_tenant_subject ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_subject_ref ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_model_channel_group ON ai_quota_policy (tenant_id, organization_id, model, channel_group_id, status);

CREATE TABLE IF NOT EXISTS ai_request_trace (
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

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_request_trace_request_attempt ON ai_request_trace (tenant_id, organization_id, request_id, attempt_no);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_trace ON ai_request_trace (tenant_id, organization_id, trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_api_key_started ON ai_request_trace (tenant_id, organization_id, api_key_id, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_model_started ON ai_request_trace (tenant_id, organization_id, requested_model, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_status_started ON ai_request_trace (tenant_id, organization_id, status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_user_status_started ON ai_request_trace (tenant_id, organization_id, user_id, status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_retention ON ai_request_trace (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_routing_decision_log (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    api_key_id INTEGER,
    legacy_api_key_id INTEGER,
    policy_id INTEGER,
    profile_id INTEGER,
    rule_id INTEGER,
    requested_model VARCHAR(256),
    resolved_model VARCHAR(256),
    capability INTEGER,
    selected_provider_id INTEGER,
    selected_channel_id INTEGER,
    selected_account_id INTEGER,
    decision_mode INTEGER,
    decision_reason TEXT,
    candidate_snapshot TEXT,
    fallback_chain TEXT,
    decision_latency_ms INTEGER,
    CONSTRAINT ck_ai_routing_decision_log_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_decision_log_request ON ai_routing_decision_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_tenant_model_created ON ai_routing_decision_log (tenant_id, organization_id, requested_model, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_log_retention ON ai_routing_decision_log (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_routing_policy (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    policy_code VARCHAR(64) NOT NULL,
    name VARCHAR(128),
    policy_scope INTEGER,
    subject_id INTEGER,
    capability INTEGER,
    default_profile_id INTEGER,
    fallback_mode INTEGER,
    slo_latency_ms INTEGER,
    slo_success_rate TEXT,
    cost_ceiling TEXT,
    currency VARCHAR(10),
    CONSTRAINT ck_ai_routing_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_routing_policy_slo_success_rate_decimal CHECK (slo_success_rate IS NULL OR (typeof(slo_success_rate) = 'text' AND length(slo_success_rate) BETWEEN 1 AND 40 AND slo_success_rate NOT GLOB '*[^0-9.-]*' AND slo_success_rate GLOB '*[0-9]*' AND (instr(slo_success_rate, '-') = 0 OR (substr(slo_success_rate, 1, 1) = '-' AND instr(substr(slo_success_rate, 2), '-') = 0)) AND length(slo_success_rate) - length(replace(slo_success_rate, '.', '')) <= 1 AND substr(ltrim(slo_success_rate, '-'), 1, 1) <> '.' AND substr(slo_success_rate, -1, 1) <> '.' AND length(replace(replace(slo_success_rate, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(slo_success_rate, '.') = 0 THEN 0 ELSE length(slo_success_rate) - instr(slo_success_rate, '.') END <= 12 AND (length(ltrim(slo_success_rate, '-')) = 1 OR substr(ltrim(slo_success_rate, '-'), 1, 1) <> '0' OR substr(ltrim(slo_success_rate, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_routing_policy_cost_ceiling_decimal CHECK (cost_ceiling IS NULL OR (typeof(cost_ceiling) = 'text' AND length(cost_ceiling) BETWEEN 1 AND 40 AND cost_ceiling NOT GLOB '*[^0-9.-]*' AND cost_ceiling GLOB '*[0-9]*' AND (instr(cost_ceiling, '-') = 0 OR (substr(cost_ceiling, 1, 1) = '-' AND instr(substr(cost_ceiling, 2), '-') = 0)) AND length(cost_ceiling) - length(replace(cost_ceiling, '.', '')) <= 1 AND substr(ltrim(cost_ceiling, '-'), 1, 1) <> '.' AND substr(cost_ceiling, -1, 1) <> '.' AND length(replace(replace(cost_ceiling, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(cost_ceiling, '.') = 0 THEN 0 ELSE length(cost_ceiling) - instr(cost_ceiling, '.') END <= 12 AND (length(ltrim(cost_ceiling, '-')) = 1 OR substr(ltrim(cost_ceiling, '-'), 1, 1) <> '0' OR substr(ltrim(cost_ceiling, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_routing_policy_non_negative_limits CHECK ((slo_latency_ms IS NULL OR slo_latency_ms >= 0) AND (cost_ceiling IS NULL OR cost_ceiling >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_tenant_code ON ai_routing_policy (tenant_id, organization_id, policy_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_scope_id ON ai_routing_policy (tenant_id, organization_id, id);

CREATE TABLE IF NOT EXISTS ai_routing_profile (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    policy_id INTEGER NOT NULL,
    profile_version INTEGER NOT NULL,
    profile_name VARCHAR(128),
    release_status INTEGER,
    traffic_percent TEXT,
    config_hash VARCHAR(128),
    published_at TEXT,
    published_by INTEGER,
    rollback_from_profile_id INTEGER,
    CONSTRAINT ck_ai_routing_profile_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ai_routing_profile_traffic_percent_decimal CHECK (traffic_percent IS NULL OR (typeof(traffic_percent) = 'text' AND length(traffic_percent) BETWEEN 1 AND 40 AND traffic_percent NOT GLOB '*[^0-9.-]*' AND traffic_percent GLOB '*[0-9]*' AND (instr(traffic_percent, '-') = 0 OR (substr(traffic_percent, 1, 1) = '-' AND instr(substr(traffic_percent, 2), '-') = 0)) AND length(traffic_percent) - length(replace(traffic_percent, '.', '')) <= 1 AND substr(ltrim(traffic_percent, '-'), 1, 1) <> '.' AND substr(traffic_percent, -1, 1) <> '.' AND length(replace(replace(traffic_percent, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(traffic_percent, '.') = 0 THEN 0 ELSE length(traffic_percent) - instr(traffic_percent, '.') END <= 12 AND (length(ltrim(traffic_percent, '-')) = 1 OR substr(ltrim(traffic_percent, '-'), 1, 1) <> '0' OR substr(ltrim(traffic_percent, '-'), 2, 1) = '.'))),
    CONSTRAINT fk_ai_routing_profile_policy FOREIGN KEY (tenant_id, organization_id, policy_id) REFERENCES ai_routing_policy (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_routing_profile_version CHECK (profile_version > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_policy_version ON ai_routing_profile (policy_id, profile_version) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_scope_id ON ai_routing_profile (tenant_id, organization_id, id);

CREATE TABLE IF NOT EXISTS ai_routing_rule (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    profile_id INTEGER NOT NULL,
    rule_code VARCHAR(64) NOT NULL,
    priority INTEGER,
    match_expression TEXT,
    target_model VARCHAR(256),
    candidate_channels TEXT,
    fallback_chain TEXT,
    constraints TEXT,
    rate_limit_policy_id INTEGER,
    effective_from TEXT,
    effective_to TEXT,
    CONSTRAINT ck_ai_routing_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ai_routing_rule_profile FOREIGN KEY (tenant_id, organization_id, profile_id) REFERENCES ai_routing_profile (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_routing_rule_priority CHECK (priority IS NULL OR priority >= 0),
    CONSTRAINT ck_ai_routing_rule_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_rule_profile_code ON ai_routing_rule (profile_id, rule_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_routing_rule_tenant_profile_priority ON ai_routing_rule (tenant_id, organization_id, profile_id, priority, status);

CREATE TABLE IF NOT EXISTS ai_site (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    site_code VARCHAR(64) NOT NULL,
    site_name VARCHAR(128) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(1024),
    base_url VARCHAR(512),
    website_url VARCHAR(512),
    docs_url VARCHAR(512),
    logo_drive_uri VARCHAR(512),
    logo_resource_snapshot TEXT,
    color_token VARCHAR(64),
    site_type VARCHAR(32) NOT NULL DEFAULT 'relay',
    owner_kind VARCHAR(32),
    region_code VARCHAR(64),
    environment INTEGER NOT NULL DEFAULT 1,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count INTEGER NOT NULL DEFAULT 0,
    last_checked_at TEXT,
    last_sync_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT ck_ai_site_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_uuid ON ai_site (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_tenant_code ON ai_site (tenant_id, organization_id, site_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_site_status_sort ON ai_site (tenant_id, organization_id, status, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_site_health_status ON ai_site (tenant_id, organization_id, status, health_status, id);

CREATE TABLE IF NOT EXISTS ai_site_service (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    site_id INTEGER NOT NULL,
    site_code VARCHAR(64) NOT NULL,
    service_code VARCHAR(64) NOT NULL,
    service_name VARCHAR(128) NOT NULL,
    service_type VARCHAR(64) NOT NULL DEFAULT 'ai_model_relay',
    protocol_code VARCHAR(64),
    base_url VARCHAR(512),
    auth_type INTEGER NOT NULL DEFAULT 1,
    credential_profile INTEGER NOT NULL DEFAULT 1,
    auth_config TEXT NOT NULL DEFAULT '{}',
    credential_ref VARCHAR(512),
    credential_hash VARCHAR(128),
    masked_label VARCHAR(128),
    credential_version INTEGER NOT NULL DEFAULT 1,
    region_code VARCHAR(64),
    environment INTEGER NOT NULL DEFAULT 1,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count INTEGER NOT NULL DEFAULT 0,
    last_verified_at TEXT,
    last_sync_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT ck_ai_site_service_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_service_uuid ON ai_site_service (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_service_site_code ON ai_site_service (tenant_id, organization_id, site_id, service_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_site_service_site_status ON ai_site_service (tenant_id, organization_id, site_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_site_service_type_status ON ai_site_service (tenant_id, organization_id, service_type, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_site_service_health_status ON ai_site_service (tenant_id, organization_id, status, health_status, id);

CREATE TABLE IF NOT EXISTS ai_usage (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT NOT NULL,
    trace_id TEXT,
    payload_hash TEXT,
    idempotency_key TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    decision_log_id INTEGER,
    api_key_id INTEGER,
    legacy_api_key_id INTEGER,
    api_key_name_snapshot VARCHAR(128),
    channel_group_id INTEGER,
    channel_group_snapshot VARCHAR(128),
    owner_type INTEGER,
    owner_id INTEGER,
    owner_name_snapshot VARCHAR(128),
    catalog_key VARCHAR(256) NOT NULL,
    requested_model_catalog_key VARCHAR(256),
    model VARCHAR(256),
    provider_native_model VARCHAR(256),
    region_code VARCHAR(64),
    provider_id INTEGER,
    channel_id INTEGER,
    modality INTEGER,
    usage_type INTEGER NOT NULL,
    billing_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id INTEGER,
    billing_meter_code VARCHAR(64) NOT NULL,
    billing_tier VARCHAR(64),
    billable_quantity TEXT NOT NULL,
    billable_unit INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    cached_tokens INTEGER,
    total_tokens INTEGER,
    request_count INTEGER,
    result_count INTEGER,
    item_count INTEGER,
    character_count INTEGER,
    image_count INTEGER,
    audio_seconds TEXT,
    video_seconds TEXT,
    storage_byte_hours TEXT,
    bandwidth_bytes INTEGER,
    base_input_unit_price TEXT,
    base_output_unit_price TEXT,
    cache_read_unit_price TEXT,
    rate_multiplier TEXT,
    reference_multiplier TEXT,
    official_reference_amount TEXT,
    upstream_cost_amount TEXT,
    customer_charge_amount TEXT,
    currency VARCHAR(10) NOT NULL,
    pricing_id INTEGER,
    pricing_plan_id INTEGER,
    pricing_plan_code VARCHAR(64),
    pricing_rule_id INTEGER,
    pricing_tier_id INTEGER,
    pricing_snapshot TEXT,
    reasoning_effort VARCHAR(64),
    occurred_at TEXT NOT NULL,
    settlement_status INTEGER NOT NULL,
    settlement_id INTEGER,
    CONSTRAINT ck_ai_usage_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_usage_billable_quantity_decimal CHECK (billable_quantity IS NULL OR (typeof(billable_quantity) = 'text' AND length(billable_quantity) BETWEEN 1 AND 40 AND billable_quantity NOT GLOB '*[^0-9.-]*' AND billable_quantity GLOB '*[0-9]*' AND (instr(billable_quantity, '-') = 0 OR (substr(billable_quantity, 1, 1) = '-' AND instr(substr(billable_quantity, 2), '-') = 0)) AND length(billable_quantity) - length(replace(billable_quantity, '.', '')) <= 1 AND substr(ltrim(billable_quantity, '-'), 1, 1) <> '.' AND substr(billable_quantity, -1, 1) <> '.' AND length(replace(replace(billable_quantity, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(billable_quantity, '.') = 0 THEN 0 ELSE length(billable_quantity) - instr(billable_quantity, '.') END <= 12 AND (length(ltrim(billable_quantity, '-')) = 1 OR substr(ltrim(billable_quantity, '-'), 1, 1) <> '0' OR substr(ltrim(billable_quantity, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_audio_seconds_decimal CHECK (audio_seconds IS NULL OR (typeof(audio_seconds) = 'text' AND length(audio_seconds) BETWEEN 1 AND 40 AND audio_seconds NOT GLOB '*[^0-9.-]*' AND audio_seconds GLOB '*[0-9]*' AND (instr(audio_seconds, '-') = 0 OR (substr(audio_seconds, 1, 1) = '-' AND instr(substr(audio_seconds, 2), '-') = 0)) AND length(audio_seconds) - length(replace(audio_seconds, '.', '')) <= 1 AND substr(ltrim(audio_seconds, '-'), 1, 1) <> '.' AND substr(audio_seconds, -1, 1) <> '.' AND length(replace(replace(audio_seconds, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(audio_seconds, '.') = 0 THEN 0 ELSE length(audio_seconds) - instr(audio_seconds, '.') END <= 12 AND (length(ltrim(audio_seconds, '-')) = 1 OR substr(ltrim(audio_seconds, '-'), 1, 1) <> '0' OR substr(ltrim(audio_seconds, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_video_seconds_decimal CHECK (video_seconds IS NULL OR (typeof(video_seconds) = 'text' AND length(video_seconds) BETWEEN 1 AND 40 AND video_seconds NOT GLOB '*[^0-9.-]*' AND video_seconds GLOB '*[0-9]*' AND (instr(video_seconds, '-') = 0 OR (substr(video_seconds, 1, 1) = '-' AND instr(substr(video_seconds, 2), '-') = 0)) AND length(video_seconds) - length(replace(video_seconds, '.', '')) <= 1 AND substr(ltrim(video_seconds, '-'), 1, 1) <> '.' AND substr(video_seconds, -1, 1) <> '.' AND length(replace(replace(video_seconds, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(video_seconds, '.') = 0 THEN 0 ELSE length(video_seconds) - instr(video_seconds, '.') END <= 12 AND (length(ltrim(video_seconds, '-')) = 1 OR substr(ltrim(video_seconds, '-'), 1, 1) <> '0' OR substr(ltrim(video_seconds, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_storage_byte_hours_decimal CHECK (storage_byte_hours IS NULL OR (typeof(storage_byte_hours) = 'text' AND length(storage_byte_hours) BETWEEN 1 AND 40 AND storage_byte_hours NOT GLOB '*[^0-9.-]*' AND storage_byte_hours GLOB '*[0-9]*' AND (instr(storage_byte_hours, '-') = 0 OR (substr(storage_byte_hours, 1, 1) = '-' AND instr(substr(storage_byte_hours, 2), '-') = 0)) AND length(storage_byte_hours) - length(replace(storage_byte_hours, '.', '')) <= 1 AND substr(ltrim(storage_byte_hours, '-'), 1, 1) <> '.' AND substr(storage_byte_hours, -1, 1) <> '.' AND length(replace(replace(storage_byte_hours, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(storage_byte_hours, '.') = 0 THEN 0 ELSE length(storage_byte_hours) - instr(storage_byte_hours, '.') END <= 12 AND (length(ltrim(storage_byte_hours, '-')) = 1 OR substr(ltrim(storage_byte_hours, '-'), 1, 1) <> '0' OR substr(ltrim(storage_byte_hours, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_base_input_unit_price_decimal CHECK (base_input_unit_price IS NULL OR (typeof(base_input_unit_price) = 'text' AND length(base_input_unit_price) BETWEEN 1 AND 40 AND base_input_unit_price NOT GLOB '*[^0-9.-]*' AND base_input_unit_price GLOB '*[0-9]*' AND (instr(base_input_unit_price, '-') = 0 OR (substr(base_input_unit_price, 1, 1) = '-' AND instr(substr(base_input_unit_price, 2), '-') = 0)) AND length(base_input_unit_price) - length(replace(base_input_unit_price, '.', '')) <= 1 AND substr(ltrim(base_input_unit_price, '-'), 1, 1) <> '.' AND substr(base_input_unit_price, -1, 1) <> '.' AND length(replace(replace(base_input_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(base_input_unit_price, '.') = 0 THEN 0 ELSE length(base_input_unit_price) - instr(base_input_unit_price, '.') END <= 12 AND (length(ltrim(base_input_unit_price, '-')) = 1 OR substr(ltrim(base_input_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(base_input_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_base_output_unit_price_decimal CHECK (base_output_unit_price IS NULL OR (typeof(base_output_unit_price) = 'text' AND length(base_output_unit_price) BETWEEN 1 AND 40 AND base_output_unit_price NOT GLOB '*[^0-9.-]*' AND base_output_unit_price GLOB '*[0-9]*' AND (instr(base_output_unit_price, '-') = 0 OR (substr(base_output_unit_price, 1, 1) = '-' AND instr(substr(base_output_unit_price, 2), '-') = 0)) AND length(base_output_unit_price) - length(replace(base_output_unit_price, '.', '')) <= 1 AND substr(ltrim(base_output_unit_price, '-'), 1, 1) <> '.' AND substr(base_output_unit_price, -1, 1) <> '.' AND length(replace(replace(base_output_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(base_output_unit_price, '.') = 0 THEN 0 ELSE length(base_output_unit_price) - instr(base_output_unit_price, '.') END <= 12 AND (length(ltrim(base_output_unit_price, '-')) = 1 OR substr(ltrim(base_output_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(base_output_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_cache_read_unit_price_decimal CHECK (cache_read_unit_price IS NULL OR (typeof(cache_read_unit_price) = 'text' AND length(cache_read_unit_price) BETWEEN 1 AND 40 AND cache_read_unit_price NOT GLOB '*[^0-9.-]*' AND cache_read_unit_price GLOB '*[0-9]*' AND (instr(cache_read_unit_price, '-') = 0 OR (substr(cache_read_unit_price, 1, 1) = '-' AND instr(substr(cache_read_unit_price, 2), '-') = 0)) AND length(cache_read_unit_price) - length(replace(cache_read_unit_price, '.', '')) <= 1 AND substr(ltrim(cache_read_unit_price, '-'), 1, 1) <> '.' AND substr(cache_read_unit_price, -1, 1) <> '.' AND length(replace(replace(cache_read_unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(cache_read_unit_price, '.') = 0 THEN 0 ELSE length(cache_read_unit_price) - instr(cache_read_unit_price, '.') END <= 12 AND (length(ltrim(cache_read_unit_price, '-')) = 1 OR substr(ltrim(cache_read_unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(cache_read_unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_rate_multiplier_decimal CHECK (rate_multiplier IS NULL OR (typeof(rate_multiplier) = 'text' AND length(rate_multiplier) BETWEEN 1 AND 40 AND rate_multiplier NOT GLOB '*[^0-9.-]*' AND rate_multiplier GLOB '*[0-9]*' AND (instr(rate_multiplier, '-') = 0 OR (substr(rate_multiplier, 1, 1) = '-' AND instr(substr(rate_multiplier, 2), '-') = 0)) AND length(rate_multiplier) - length(replace(rate_multiplier, '.', '')) <= 1 AND substr(ltrim(rate_multiplier, '-'), 1, 1) <> '.' AND substr(rate_multiplier, -1, 1) <> '.' AND length(replace(replace(rate_multiplier, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(rate_multiplier, '.') = 0 THEN 0 ELSE length(rate_multiplier) - instr(rate_multiplier, '.') END <= 12 AND (length(ltrim(rate_multiplier, '-')) = 1 OR substr(ltrim(rate_multiplier, '-'), 1, 1) <> '0' OR substr(ltrim(rate_multiplier, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_reference_multiplier_decimal CHECK (reference_multiplier IS NULL OR (typeof(reference_multiplier) = 'text' AND length(reference_multiplier) BETWEEN 1 AND 40 AND reference_multiplier NOT GLOB '*[^0-9.-]*' AND reference_multiplier GLOB '*[0-9]*' AND (instr(reference_multiplier, '-') = 0 OR (substr(reference_multiplier, 1, 1) = '-' AND instr(substr(reference_multiplier, 2), '-') = 0)) AND length(reference_multiplier) - length(replace(reference_multiplier, '.', '')) <= 1 AND substr(ltrim(reference_multiplier, '-'), 1, 1) <> '.' AND substr(reference_multiplier, -1, 1) <> '.' AND length(replace(replace(reference_multiplier, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(reference_multiplier, '.') = 0 THEN 0 ELSE length(reference_multiplier) - instr(reference_multiplier, '.') END <= 12 AND (length(ltrim(reference_multiplier, '-')) = 1 OR substr(ltrim(reference_multiplier, '-'), 1, 1) <> '0' OR substr(ltrim(reference_multiplier, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_official_reference_amount_decimal CHECK (official_reference_amount IS NULL OR (typeof(official_reference_amount) = 'text' AND length(official_reference_amount) BETWEEN 1 AND 40 AND official_reference_amount NOT GLOB '*[^0-9.-]*' AND official_reference_amount GLOB '*[0-9]*' AND (instr(official_reference_amount, '-') = 0 OR (substr(official_reference_amount, 1, 1) = '-' AND instr(substr(official_reference_amount, 2), '-') = 0)) AND length(official_reference_amount) - length(replace(official_reference_amount, '.', '')) <= 1 AND substr(ltrim(official_reference_amount, '-'), 1, 1) <> '.' AND substr(official_reference_amount, -1, 1) <> '.' AND length(replace(replace(official_reference_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(official_reference_amount, '.') = 0 THEN 0 ELSE length(official_reference_amount) - instr(official_reference_amount, '.') END <= 12 AND (length(ltrim(official_reference_amount, '-')) = 1 OR substr(ltrim(official_reference_amount, '-'), 1, 1) <> '0' OR substr(ltrim(official_reference_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_upstream_cost_amount_decimal CHECK (upstream_cost_amount IS NULL OR (typeof(upstream_cost_amount) = 'text' AND length(upstream_cost_amount) BETWEEN 1 AND 40 AND upstream_cost_amount NOT GLOB '*[^0-9.-]*' AND upstream_cost_amount GLOB '*[0-9]*' AND (instr(upstream_cost_amount, '-') = 0 OR (substr(upstream_cost_amount, 1, 1) = '-' AND instr(substr(upstream_cost_amount, 2), '-') = 0)) AND length(upstream_cost_amount) - length(replace(upstream_cost_amount, '.', '')) <= 1 AND substr(ltrim(upstream_cost_amount, '-'), 1, 1) <> '.' AND substr(upstream_cost_amount, -1, 1) <> '.' AND length(replace(replace(upstream_cost_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(upstream_cost_amount, '.') = 0 THEN 0 ELSE length(upstream_cost_amount) - instr(upstream_cost_amount, '.') END <= 12 AND (length(ltrim(upstream_cost_amount, '-')) = 1 OR substr(ltrim(upstream_cost_amount, '-'), 1, 1) <> '0' OR substr(ltrim(upstream_cost_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_customer_charge_amount_decimal CHECK (customer_charge_amount IS NULL OR (typeof(customer_charge_amount) = 'text' AND length(customer_charge_amount) BETWEEN 1 AND 40 AND customer_charge_amount NOT GLOB '*[^0-9.-]*' AND customer_charge_amount GLOB '*[0-9]*' AND (instr(customer_charge_amount, '-') = 0 OR (substr(customer_charge_amount, 1, 1) = '-' AND instr(substr(customer_charge_amount, 2), '-') = 0)) AND length(customer_charge_amount) - length(replace(customer_charge_amount, '.', '')) <= 1 AND substr(ltrim(customer_charge_amount, '-'), 1, 1) <> '.' AND substr(customer_charge_amount, -1, 1) <> '.' AND length(replace(replace(customer_charge_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(customer_charge_amount, '.') = 0 THEN 0 ELSE length(customer_charge_amount) - instr(customer_charge_amount, '.') END <= 12 AND (length(ltrim(customer_charge_amount, '-')) = 1 OR substr(ltrim(customer_charge_amount, '-'), 1, 1) <> '0' OR substr(ltrim(customer_charge_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_non_negative_counts CHECK ((prompt_tokens IS NULL OR prompt_tokens >= 0) AND (completion_tokens IS NULL OR completion_tokens >= 0) AND (cached_tokens IS NULL OR cached_tokens >= 0) AND (total_tokens IS NULL OR total_tokens >= 0) AND (request_count IS NULL OR request_count >= 0) AND (result_count IS NULL OR result_count >= 0) AND (item_count IS NULL OR item_count >= 0) AND (character_count IS NULL OR character_count >= 0) AND (image_count IS NULL OR image_count >= 0)),
    CONSTRAINT ck_ai_usage_non_negative_amounts CHECK (billable_quantity >= 0 AND (audio_seconds IS NULL OR audio_seconds >= 0) AND (video_seconds IS NULL OR video_seconds >= 0) AND (storage_byte_hours IS NULL OR storage_byte_hours >= 0) AND (official_reference_amount IS NULL OR official_reference_amount >= 0) AND (upstream_cost_amount IS NULL OR upstream_cost_amount >= 0) AND (customer_charge_amount IS NULL OR customer_charge_amount >= 0)),
    CONSTRAINT ck_ai_usage_currency CHECK (length(trim(currency)) BETWEEN 3 AND 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_scope_id ON ai_usage (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_idempotency ON ai_usage (tenant_id, organization_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_request ON ai_usage (tenant_id, organization_id, request_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_owner_occurred ON ai_usage (tenant_id, organization_id, owner_type, owner_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_api_key_occurred ON ai_usage (tenant_id, organization_id, api_key_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_occurred ON ai_usage (tenant_id, organization_id, catalog_key, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_pricing_plan_occurred ON ai_usage (tenant_id, organization_id, pricing_plan_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_meter_occurred ON ai_usage (tenant_id, organization_id, billing_meter_code, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_settlement_status ON ai_usage (tenant_id, organization_id, settlement_status, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_retention ON ai_usage (retention_until, id);

CREATE TABLE IF NOT EXISTS ai_usage_service_provider_edge (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    idempotency_key TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    usage_fact_id INTEGER NOT NULL,
    edge_id INTEGER NOT NULL,
    edge_depth INTEGER NOT NULL,
    seller_provider_id INTEGER,
    buyer_provider_id INTEGER,
    amount_role VARCHAR(64) NOT NULL,
    pricing_plan_id INTEGER,
    pricing_rule_id INTEGER,
    billing_meter_code VARCHAR(64),
    token_kind VARCHAR(64),
    billable_quantity TEXT NOT NULL,
    unit_price TEXT,
    unit_size TEXT,
    charge_amount TEXT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    fx_rate_snapshot TEXT,
    settlement_currency VARCHAR(10),
    converted_charge_amount TEXT,
    seller_snapshot TEXT,
    buyer_snapshot TEXT,
    price_snapshot TEXT,
    occurred_at TEXT NOT NULL,
    settlement_status INTEGER,
    CONSTRAINT ck_ai_usage_service_provider_edge_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_usage_service_provider_edge_billable_quantity_decimal CHECK (billable_quantity IS NULL OR (typeof(billable_quantity) = 'text' AND length(billable_quantity) BETWEEN 1 AND 40 AND billable_quantity NOT GLOB '*[^0-9.-]*' AND billable_quantity GLOB '*[0-9]*' AND (instr(billable_quantity, '-') = 0 OR (substr(billable_quantity, 1, 1) = '-' AND instr(substr(billable_quantity, 2), '-') = 0)) AND length(billable_quantity) - length(replace(billable_quantity, '.', '')) <= 1 AND substr(ltrim(billable_quantity, '-'), 1, 1) <> '.' AND substr(billable_quantity, -1, 1) <> '.' AND length(replace(replace(billable_quantity, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(billable_quantity, '.') = 0 THEN 0 ELSE length(billable_quantity) - instr(billable_quantity, '.') END <= 12 AND (length(ltrim(billable_quantity, '-')) = 1 OR substr(ltrim(billable_quantity, '-'), 1, 1) <> '0' OR substr(ltrim(billable_quantity, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_service_provider_edge_unit_price_decimal CHECK (unit_price IS NULL OR (typeof(unit_price) = 'text' AND length(unit_price) BETWEEN 1 AND 40 AND unit_price NOT GLOB '*[^0-9.-]*' AND unit_price GLOB '*[0-9]*' AND (instr(unit_price, '-') = 0 OR (substr(unit_price, 1, 1) = '-' AND instr(substr(unit_price, 2), '-') = 0)) AND length(unit_price) - length(replace(unit_price, '.', '')) <= 1 AND substr(ltrim(unit_price, '-'), 1, 1) <> '.' AND substr(unit_price, -1, 1) <> '.' AND length(replace(replace(unit_price, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(unit_price, '.') = 0 THEN 0 ELSE length(unit_price) - instr(unit_price, '.') END <= 12 AND (length(ltrim(unit_price, '-')) = 1 OR substr(ltrim(unit_price, '-'), 1, 1) <> '0' OR substr(ltrim(unit_price, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_service_provider_edge_unit_size_decimal CHECK (unit_size IS NULL OR (typeof(unit_size) = 'text' AND length(unit_size) BETWEEN 1 AND 40 AND unit_size NOT GLOB '*[^0-9.-]*' AND unit_size GLOB '*[0-9]*' AND (instr(unit_size, '-') = 0 OR (substr(unit_size, 1, 1) = '-' AND instr(substr(unit_size, 2), '-') = 0)) AND length(unit_size) - length(replace(unit_size, '.', '')) <= 1 AND substr(ltrim(unit_size, '-'), 1, 1) <> '.' AND substr(unit_size, -1, 1) <> '.' AND length(replace(replace(unit_size, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(unit_size, '.') = 0 THEN 0 ELSE length(unit_size) - instr(unit_size, '.') END <= 12 AND (length(ltrim(unit_size, '-')) = 1 OR substr(ltrim(unit_size, '-'), 1, 1) <> '0' OR substr(ltrim(unit_size, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_service_provider_edge_charge_amount_decimal CHECK (charge_amount IS NULL OR (typeof(charge_amount) = 'text' AND length(charge_amount) BETWEEN 1 AND 40 AND charge_amount NOT GLOB '*[^0-9.-]*' AND charge_amount GLOB '*[0-9]*' AND (instr(charge_amount, '-') = 0 OR (substr(charge_amount, 1, 1) = '-' AND instr(substr(charge_amount, 2), '-') = 0)) AND length(charge_amount) - length(replace(charge_amount, '.', '')) <= 1 AND substr(ltrim(charge_amount, '-'), 1, 1) <> '.' AND substr(charge_amount, -1, 1) <> '.' AND length(replace(replace(charge_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(charge_amount, '.') = 0 THEN 0 ELSE length(charge_amount) - instr(charge_amount, '.') END <= 12 AND (length(ltrim(charge_amount, '-')) = 1 OR substr(ltrim(charge_amount, '-'), 1, 1) <> '0' OR substr(ltrim(charge_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_service_provider_edge_fx_rate_snapshot_decimal CHECK (fx_rate_snapshot IS NULL OR (typeof(fx_rate_snapshot) = 'text' AND length(fx_rate_snapshot) BETWEEN 1 AND 40 AND fx_rate_snapshot NOT GLOB '*[^0-9.-]*' AND fx_rate_snapshot GLOB '*[0-9]*' AND (instr(fx_rate_snapshot, '-') = 0 OR (substr(fx_rate_snapshot, 1, 1) = '-' AND instr(substr(fx_rate_snapshot, 2), '-') = 0)) AND length(fx_rate_snapshot) - length(replace(fx_rate_snapshot, '.', '')) <= 1 AND substr(ltrim(fx_rate_snapshot, '-'), 1, 1) <> '.' AND substr(fx_rate_snapshot, -1, 1) <> '.' AND length(replace(replace(fx_rate_snapshot, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(fx_rate_snapshot, '.') = 0 THEN 0 ELSE length(fx_rate_snapshot) - instr(fx_rate_snapshot, '.') END <= 12 AND (length(ltrim(fx_rate_snapshot, '-')) = 1 OR substr(ltrim(fx_rate_snapshot, '-'), 1, 1) <> '0' OR substr(ltrim(fx_rate_snapshot, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ai_usage_service_provider_edge_converted_charge_amount_decimal CHECK (converted_charge_amount IS NULL OR (typeof(converted_charge_amount) = 'text' AND length(converted_charge_amount) BETWEEN 1 AND 40 AND converted_charge_amount NOT GLOB '*[^0-9.-]*' AND converted_charge_amount GLOB '*[0-9]*' AND (instr(converted_charge_amount, '-') = 0 OR (substr(converted_charge_amount, 1, 1) = '-' AND instr(substr(converted_charge_amount, 2), '-') = 0)) AND length(converted_charge_amount) - length(replace(converted_charge_amount, '.', '')) <= 1 AND substr(ltrim(converted_charge_amount, '-'), 1, 1) <> '.' AND substr(converted_charge_amount, -1, 1) <> '.' AND length(replace(replace(converted_charge_amount, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(converted_charge_amount, '.') = 0 THEN 0 ELSE length(converted_charge_amount) - instr(converted_charge_amount, '.') END <= 12 AND (length(ltrim(converted_charge_amount, '-')) = 1 OR substr(ltrim(converted_charge_amount, '-'), 1, 1) <> '0' OR substr(ltrim(converted_charge_amount, '-'), 2, 1) = '.'))),
    CONSTRAINT fk_ai_usage_service_provider_edge_usage FOREIGN KEY (tenant_id, organization_id, usage_fact_id) REFERENCES ai_usage (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_ai_usage_service_provider_edge_depth CHECK (edge_depth >= 0),
    CONSTRAINT ck_ai_usage_service_provider_edge_amounts CHECK (billable_quantity >= 0 AND charge_amount >= 0 AND (converted_charge_amount IS NULL OR converted_charge_amount >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_service_provider_edge_usage_depth ON ai_usage_service_provider_edge (tenant_id, organization_id, usage_fact_id, edge_depth, amount_role);
CREATE INDEX IF NOT EXISTS idx_ai_usage_service_provider_edge_seller_time ON ai_usage_service_provider_edge (tenant_id, organization_id, seller_provider_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_service_provider_edge_buyer_time ON ai_usage_service_provider_edge (tenant_id, organization_id, buyer_provider_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_service_provider_edge_retention ON ai_usage_service_provider_edge (retention_until, id);

CREATE TABLE IF NOT EXISTS iam_gateway_access_policy (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    name VARCHAR(128),
    policy_type INTEGER,
    subject_type INTEGER,
    subject_id INTEGER,
    subject_ref_hash VARCHAR(128),
    subject_ref_masked VARCHAR(128),
    allowed_capabilities TEXT,
    denied_capabilities TEXT,
    allowed_models TEXT,
    denied_models TEXT,
    network_policy_mode INTEGER,
    ip_rule_count INTEGER,
    ip_allowlist TEXT,
    ip_denylist TEXT,
    region_allowlist TEXT,
    max_context_tokens INTEGER,
    data_retention_mode INTEGER,
    effective_from TEXT,
    effective_to TEXT,
    CONSTRAINT ck_iam_gateway_access_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_tenant_subject_status ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_subject_ref ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    user_id INTEGER NOT NULL,
    owner_type INTEGER,
    owner_id INTEGER,
    legacy_api_key_id INTEGER,
    channel_group_id INTEGER,
    name VARCHAR(128),
    key_prefix VARCHAR(32),
    key_display_masked VARCHAR(64),
    key_hash VARCHAR(128),
    hash_alg VARCHAR(32),
    secret_version INTEGER,
    idempotency_key VARCHAR(128) NOT NULL,
    policy_id INTEGER,
    quota_policy_id INTEGER,
    rate_limit_policy_id INTEGER,
    environment INTEGER,
    expire_at TEXT,
    last_used_at TEXT,
    last_used_ip_hash VARCHAR(128),
    last_used_ip_masked VARCHAR(64),
    last_used_ip_region VARCHAR(128),
    last_revealed_at TEXT,
    rotated_from_key_id INTEGER,
    revoked_at TEXT,
    revoked_by INTEGER,
    CONSTRAINT ck_iam_gateway_api_key_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_hash ON iam_gateway_api_key (key_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_legacy ON iam_gateway_api_key (legacy_api_key_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_idempotency ON iam_gateway_api_key (tenant_id, idempotency_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_scope_id ON iam_gateway_api_key (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_tenant_user_status ON iam_gateway_api_key (tenant_id, organization_id, user_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_ai_channel_group_status ON iam_gateway_api_key (tenant_id, organization_id, channel_group_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key_channel_group (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    user_id INTEGER NOT NULL,
    owner_type INTEGER,
    owner_id INTEGER,
    api_key_id INTEGER NOT NULL DEFAULT 0,
    channel_group_id INTEGER NOT NULL DEFAULT 0,
    channel_group_code VARCHAR(64),
    binding_role VARCHAR(32) NOT NULL DEFAULT 'route',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'auto',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TEXT,
    effective_to TEXT,
    CONSTRAINT ck_iam_gateway_api_key_channel_group_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_iam_gateway_api_key_channel_group_api_key FOREIGN KEY (tenant_id, organization_id, api_key_id) REFERENCES iam_gateway_api_key (tenant_id, organization_id, id) ON DELETE RESTRICT,
    CONSTRAINT ck_iam_gateway_api_key_channel_group_ids CHECK (api_key_id > 0 AND channel_group_id > 0),
    CONSTRAINT ck_iam_gateway_api_key_channel_group_weighting CHECK (priority >= 0 AND weight >= 0),
    CONSTRAINT ck_iam_gateway_api_key_channel_group_effective_interval CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_channel_group_uuid ON iam_gateway_api_key_channel_group (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_channel_group_binding ON iam_gateway_api_key_channel_group (tenant_id, organization_id, api_key_id, channel_group_id, binding_role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_channel_group_active ON iam_gateway_api_key_channel_group (tenant_id, organization_id, api_key_id, status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_channel_group_group ON iam_gateway_api_key_channel_group (tenant_id, organization_id, channel_group_id, status, priority, id);

CREATE TABLE IF NOT EXISTS iam_gateway_risk_rule (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    rule_name VARCHAR(128),
    rule_category INTEGER,
    rule_type INTEGER,
    scope_type INTEGER,
    scope_id INTEGER,
    target_type INTEGER,
    target_value VARCHAR(256),
    target_value_hash VARCHAR(128),
    target_value_masked VARCHAR(128),
    target_value_cipher_ref VARCHAR(256),
    match_mode INTEGER,
    reason VARCHAR(512),
    action INTEGER,
    priority INTEGER,
    requests_per_second INTEGER,
    requests_per_minute INTEGER,
    requests_per_day INTEGER,
    tokens_per_minute INTEGER,
    burst_limit TEXT,
    block_duration_seconds INTEGER,
    effective_from TEXT,
    effective_to TEXT,
    hit_count INTEGER,
    last_hit_at TEXT,
    CONSTRAINT ck_iam_gateway_risk_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_iam_gateway_risk_rule_burst_limit_decimal CHECK (burst_limit IS NULL OR (typeof(burst_limit) = 'text' AND length(burst_limit) BETWEEN 1 AND 40 AND burst_limit NOT GLOB '*[^0-9.-]*' AND burst_limit GLOB '*[0-9]*' AND (instr(burst_limit, '-') = 0 OR (substr(burst_limit, 1, 1) = '-' AND instr(substr(burst_limit, 2), '-') = 0)) AND length(burst_limit) - length(replace(burst_limit, '.', '')) <= 1 AND substr(ltrim(burst_limit, '-'), 1, 1) <> '.' AND substr(burst_limit, -1, 1) <> '.' AND length(replace(replace(burst_limit, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(burst_limit, '.') = 0 THEN 0 ELSE length(burst_limit) - instr(burst_limit, '.') END <= 12 AND (length(ltrim(burst_limit, '-')) = 1 OR substr(ltrim(burst_limit, '-'), 1, 1) <> '0' OR substr(ltrim(burst_limit, '-'), 2, 1) = '.')))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_risk_rule_tenant_target ON iam_gateway_risk_rule (tenant_id, organization_id, rule_type, target_type, target_value) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_scope_priority ON iam_gateway_risk_rule (tenant_id, organization_id, rule_category, scope_type, scope_id, priority, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_target_hash ON iam_gateway_risk_rule (tenant_id, organization_id, target_type, target_value_hash, status);

CREATE TABLE IF NOT EXISTS ops_alert_event (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    alert_no VARCHAR(128),
    severity INTEGER,
    source VARCHAR(128),
    title VARCHAR(200),
    message VARCHAR(1024),
    alert_status INTEGER,
    first_seen_at TEXT,
    last_seen_at TEXT,
    resolved_at TEXT,
    resolved_by INTEGER,
    CONSTRAINT ck_ops_alert_event_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_alert_event_no ON ops_alert_event (alert_no);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_tenant_status_latest ON ops_alert_event (tenant_id, organization_id, status, last_seen_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_retention ON ops_alert_event (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_audit_log (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    operator_id INTEGER,
    action VARCHAR(128),
    target_type INTEGER,
    target_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    operator_type INTEGER,
    operator_name_snapshot VARCHAR(128),
    target_uuid VARCHAR(64),
    client_ip_hash VARCHAR(128),
    user_agent_hash VARCHAR(128),
    before_hash VARCHAR(128),
    after_hash VARCHAR(128),
    change_summary TEXT,
    risk_level INTEGER,
    approval_id INTEGER,
    CONSTRAINT ck_ops_audit_log_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_operator_created ON ops_audit_log (tenant_id, organization_id, operator_type, operator_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_target_created ON ops_audit_log (tenant_id, organization_id, target_type, target_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_request ON ops_audit_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_retention ON ops_audit_log (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_config_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    snapshot_no VARCHAR(128),
    config_scope INTEGER,
    config_type INTEGER,
    source_table VARCHAR(128),
    source_ids TEXT,
    config_payload TEXT,
    config_hash VARCHAR(128),
    published_at TEXT,
    published_by INTEGER,
    rollback_from_snapshot_id INTEGER,
    CONSTRAINT ck_ops_config_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_config_snapshot_no ON ops_config_snapshot (snapshot_no);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_tenant_scope ON ops_config_snapshot (tenant_id, organization_id, config_scope, config_type, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_retention ON ops_config_snapshot (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_gateway_heartbeat (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    instance_id INTEGER,
    heartbeat_at TEXT,
    cpu_percent TEXT,
    memory_percent TEXT,
    disk_percent TEXT,
    network_in_bytes INTEGER,
    network_out_bytes INTEGER,
    active_connections INTEGER,
    uptime_seconds INTEGER,
    open_file_count INTEGER,
    thread_count INTEGER,
    payload TEXT,
    CONSTRAINT ck_ops_gateway_heartbeat_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_ops_gateway_heartbeat_cpu_percent_decimal CHECK (cpu_percent IS NULL OR (typeof(cpu_percent) = 'text' AND length(cpu_percent) BETWEEN 1 AND 40 AND cpu_percent NOT GLOB '*[^0-9.-]*' AND cpu_percent GLOB '*[0-9]*' AND (instr(cpu_percent, '-') = 0 OR (substr(cpu_percent, 1, 1) = '-' AND instr(substr(cpu_percent, 2), '-') = 0)) AND length(cpu_percent) - length(replace(cpu_percent, '.', '')) <= 1 AND substr(ltrim(cpu_percent, '-'), 1, 1) <> '.' AND substr(cpu_percent, -1, 1) <> '.' AND length(replace(replace(cpu_percent, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(cpu_percent, '.') = 0 THEN 0 ELSE length(cpu_percent) - instr(cpu_percent, '.') END <= 12 AND (length(ltrim(cpu_percent, '-')) = 1 OR substr(ltrim(cpu_percent, '-'), 1, 1) <> '0' OR substr(ltrim(cpu_percent, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ops_gateway_heartbeat_memory_percent_decimal CHECK (memory_percent IS NULL OR (typeof(memory_percent) = 'text' AND length(memory_percent) BETWEEN 1 AND 40 AND memory_percent NOT GLOB '*[^0-9.-]*' AND memory_percent GLOB '*[0-9]*' AND (instr(memory_percent, '-') = 0 OR (substr(memory_percent, 1, 1) = '-' AND instr(substr(memory_percent, 2), '-') = 0)) AND length(memory_percent) - length(replace(memory_percent, '.', '')) <= 1 AND substr(ltrim(memory_percent, '-'), 1, 1) <> '.' AND substr(memory_percent, -1, 1) <> '.' AND length(replace(replace(memory_percent, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(memory_percent, '.') = 0 THEN 0 ELSE length(memory_percent) - instr(memory_percent, '.') END <= 12 AND (length(ltrim(memory_percent, '-')) = 1 OR substr(ltrim(memory_percent, '-'), 1, 1) <> '0' OR substr(ltrim(memory_percent, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ops_gateway_heartbeat_disk_percent_decimal CHECK (disk_percent IS NULL OR (typeof(disk_percent) = 'text' AND length(disk_percent) BETWEEN 1 AND 40 AND disk_percent NOT GLOB '*[^0-9.-]*' AND disk_percent GLOB '*[0-9]*' AND (instr(disk_percent, '-') = 0 OR (substr(disk_percent, 1, 1) = '-' AND instr(substr(disk_percent, 2), '-') = 0)) AND length(disk_percent) - length(replace(disk_percent, '.', '')) <= 1 AND substr(ltrim(disk_percent, '-'), 1, 1) <> '.' AND substr(disk_percent, -1, 1) <> '.' AND length(replace(replace(disk_percent, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(disk_percent, '.') = 0 THEN 0 ELSE length(disk_percent) - instr(disk_percent, '.') END <= 12 AND (length(ltrim(disk_percent, '-')) = 1 OR substr(ltrim(disk_percent, '-'), 1, 1) <> '0' OR substr(ltrim(disk_percent, '-'), 2, 1) = '.')))
);

CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_instance_status_time ON ops_gateway_heartbeat (instance_id, status, heartbeat_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_retention ON ops_gateway_heartbeat (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_gateway_instance (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
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
    started_at TEXT,
    last_heartbeat_at TEXT,
    health_status INTEGER,
    config_hash VARCHAR(128),
    CONSTRAINT ck_ops_gateway_instance_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_gateway_instance_code ON ops_gateway_instance (instance_code);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_instance_tenant_status_heartbeat ON ops_gateway_instance (tenant_id, organization_id, status, deleted_at, last_heartbeat_at, updated_at, id);

CREATE TABLE IF NOT EXISTS ops_job_execution (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER,
    request_id TEXT,
    trace_id TEXT,
    payload_hash TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TEXT,
    legal_hold INTEGER NOT NULL DEFAULT FALSE,
    metadata TEXT NOT NULL DEFAULT '{}',
    job_name VARCHAR(128),
    job_type INTEGER,
    trigger_type INTEGER,
    started_at TEXT,
    ended_at TEXT,
    duration_ms INTEGER,
    execution_status INTEGER,
    processed_count INTEGER,
    success_count INTEGER,
    failure_count INTEGER,
    failure_reason VARCHAR(1024),
    payload TEXT,
    CONSTRAINT ck_ops_job_execution_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE INDEX IF NOT EXISTS idx_ops_job_execution_name_started ON ops_job_execution (job_name, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_status_started ON ops_job_execution (execution_status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_model_ranking_scope_started ON ops_job_execution (tenant_id, organization_id, status, job_type, job_name, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_retention ON ops_job_execution (retention_until, id);

CREATE TABLE IF NOT EXISTS ops_metric_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    source_type TEXT,
    source_id INTEGER,
    source_version INTEGER NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}',
    metric_scope INTEGER NOT NULL,
    metric_name VARCHAR(128) NOT NULL,
    metric_period INTEGER NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT,
    dimension_key VARCHAR(128) NOT NULL,
    dimension_value VARCHAR(256) NOT NULL,
    metric_value TEXT NOT NULL,
    metric_unit VARCHAR(64),
    payload TEXT,
    CONSTRAINT ck_ops_metric_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ops_metric_snapshot_metric_value_decimal CHECK (metric_value IS NULL OR (typeof(metric_value) = 'text' AND length(metric_value) BETWEEN 1 AND 40 AND metric_value NOT GLOB '*[^0-9.-]*' AND metric_value GLOB '*[0-9]*' AND (instr(metric_value, '-') = 0 OR (substr(metric_value, 1, 1) = '-' AND instr(substr(metric_value, 2), '-') = 0)) AND length(metric_value) - length(replace(metric_value, '.', '')) <= 1 AND substr(ltrim(metric_value, '-'), 1, 1) <> '.' AND substr(metric_value, -1, 1) <> '.' AND length(replace(replace(metric_value, '-', ''), '.', '')) <= 38 AND CASE WHEN instr(metric_value, '.') = 0 THEN 0 ELSE length(metric_value) - instr(metric_value, '.') END <= 12 AND (length(ltrim(metric_value, '-')) = 1 OR substr(ltrim(metric_value, '-'), 1, 1) <> '0' OR substr(ltrim(metric_value, '-'), 2, 1) = '.'))),
    CONSTRAINT ck_ops_metric_snapshot_period_interval CHECK (period_end IS NULL OR period_end > period_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_metric_snapshot ON ops_metric_snapshot (tenant_id, organization_id, metric_scope, metric_name, metric_period, period_start, dimension_key, dimension_value);

CREATE TABLE IF NOT EXISTS ops_notification_message (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    app_id VARCHAR(128),
    scope_type INTEGER NOT NULL DEFAULT 1,
    message_code VARCHAR(128),
    message_type INTEGER,
    title VARCHAR(200),
    summary VARCHAR(512),
    content TEXT,
    severity INTEGER,
    priority INTEGER NOT NULL DEFAULT 0,
    show_as_popup INTEGER NOT NULL DEFAULT FALSE,
    action_url VARCHAR(1024),
    published_at TEXT,
    expire_at TEXT,
    CONSTRAINT ck_ops_notification_message_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_notification_message_scope_id ON ops_notification_message (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_message_scope ON ops_notification_message (tenant_id, organization_id, app_id, scope_type, status, published_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_message_popup ON ops_notification_message (tenant_id, organization_id, show_as_popup, published_at, id);

CREATE TABLE IF NOT EXISTS ops_notification_delivery (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    app_id VARCHAR(128) NOT NULL DEFAULT 'default',
    message_id INTEGER NOT NULL,
    delivery_channel INTEGER NOT NULL,
    delivery_status INTEGER,
    read_at TEXT,
    popup_seen_at TEXT,
    archived_at TEXT,
    delivered_at TEXT,
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
    uuid TEXT NOT NULL,
    tenant_id INTEGER NOT NULL DEFAULT 0,
    organization_id INTEGER NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    deleted_by INTEGER,
    metadata TEXT NOT NULL DEFAULT '{}',
    message_id INTEGER NOT NULL,
    app_id VARCHAR(128),
    recipient_type INTEGER NOT NULL,
    recipient_value VARCHAR(256),
    recipient_user_id INTEGER,
    recipient_role_code VARCHAR(128),
    CONSTRAINT ck_ops_notification_recipient_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_ops_notification_recipient_message FOREIGN KEY (tenant_id, organization_id, message_id) REFERENCES ops_notification_message (tenant_id, organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_message ON ops_notification_recipient (tenant_id, organization_id, message_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_user ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_user_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ops_notification_recipient_role ON ops_notification_recipient (tenant_id, organization_id, recipient_type, recipient_role_code, status, id);
