-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.
-- Registry version: 0.3.0.
-- Registry SHA-256: e488b562ba6285144585ad352ade6bca9b3c5699af75a79e591c61f24b391cfb.
-- Dialect: postgres.
-- Materialize: python -B -m tools.schema_compiler --dialect all --materialize.
-- Do not edit by hand; update Schema Registry and regenerate.

CREATE TABLE IF NOT EXISTS ai_channel (
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
    provider_id BIGINT,
    provider_code VARCHAR(64),
    site_id BIGINT,
    site_service_id BIGINT,
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
    auth_config JSONB,
    credential_ref VARCHAR(256),
    credential_hash VARCHAR(128),
    credential_version BIGINT,
    credential_rotation_policy JSONB,
    credential_rotation_strategy VARCHAR(64) NOT NULL DEFAULT 'default',
    masked_label VARCHAR(128),
    environment INTEGER,
    region_code VARCHAR(64),
    quota_unit INTEGER,
    quota_limit NUMERIC(38, 12),
    quota_used NUMERIC(38, 12),
    upstream_balance_amount NUMERIC(38, 12),
    upstream_balance_currency VARCHAR(10),
    last_balance_checked_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    next_rotate_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    rpm_limit BIGINT,
    timeout_ms INTEGER,
    retry_policy JSONB,
    circuit_breaker_policy JSONB,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count BIGINT,
    proxy_id BIGINT,
    risk_level INTEGER,
    CONSTRAINT ck_ai_channel_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
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
    channel_id BIGINT NOT NULL,
    provider_code VARCHAR(64),
    channel_code VARCHAR(64),
    credential_name VARCHAR(128) NOT NULL,
    base_url VARCHAR(512) NOT NULL,
    auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    credential_ref VARCHAR(256) NOT NULL,
    credential_hash VARCHAR(128) NOT NULL,
    masked_label VARCHAR(128),
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count BIGINT NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_channel_credential_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_credential_uuid ON ai_channel_credential (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_channel_credential_channel ON ai_channel_credential (tenant_id, organization_id, channel_id, status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_credential_ref ON ai_channel_credential (tenant_id, organization_id, credential_ref);

CREATE TABLE IF NOT EXISTS ai_channel_group (
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
    group_code VARCHAR(64) NOT NULL,
    group_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    provider_code VARCHAR(64),
    group_type VARCHAR(32),
    routing_policy_id BIGINT,
    quota_policy_id BIGINT,
    rate_limit_policy_id BIGINT,
    environment INTEGER,
    pricing_plan_id BIGINT,
    pricing_plan_code VARCHAR(64),
    rate_multiplier NUMERIC(38, 12),
    price_reference_mode INTEGER,
    official_price_multiplier NUMERIC(38, 12),
    billing_type INTEGER,
    capacity_limit BIGINT,
    allowed_origin JSONB,
    CONSTRAINT ck_ai_channel_group_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_uuid ON ai_channel_group (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_tenant_code ON ai_channel_group (tenant_id, organization_id, group_code);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_scope_id ON ai_channel_group (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_provider_status ON ai_channel_group (tenant_id, organization_id, provider_code, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_tenant_status_updated ON ai_channel_group (tenant_id, organization_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_pricing ON ai_channel_group (tenant_id, organization_id, pricing_plan_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS ai_channel_group_member (
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
    channel_group_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
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
    channel_group_id BIGINT NOT NULL,
    group_code VARCHAR(64),
    provider_code VARCHAR(64),
    channel_available_count BIGINT,
    channel_total_count BIGINT,
    capacity_used NUMERIC(38, 12),
    capacity_limit NUMERIC(38, 12),
    request_count_today BIGINT,
    request_count_total BIGINT,
    usage_amount_today NUMERIC(38, 12),
    usage_amount_total NUMERIC(38, 12),
    health_status INTEGER,
    snapshot_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_ai_channel_group_metric_snapshot_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_non_negative_counts CHECK ((channel_available_count IS NULL OR channel_available_count >= 0) AND (channel_total_count IS NULL OR channel_total_count >= 0) AND (request_count_today IS NULL OR request_count_today >= 0) AND (request_count_total IS NULL OR request_count_total >= 0)),
    CONSTRAINT ck_ai_channel_group_metric_snapshot_non_negative_amounts CHECK ((capacity_used IS NULL OR capacity_used >= 0) AND (capacity_limit IS NULL OR capacity_limit >= 0) AND (usage_amount_today IS NULL OR usage_amount_today >= 0) AND (usage_amount_total IS NULL OR usage_amount_total >= 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_metric_snapshot_uuid ON ai_channel_group_metric_snapshot (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_metric_snapshot ON ai_channel_group_metric_snapshot (tenant_id, organization_id, channel_group_id, snapshot_at);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_metric_tenant_status ON ai_channel_group_metric_snapshot (tenant_id, organization_id, status, snapshot_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_metric_status ON ai_channel_group_metric_snapshot (tenant_id, organization_id, provider_code, health_status, snapshot_at, id);

CREATE TABLE IF NOT EXISTS ai_channel_group_resource (
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
    channel_group_id BIGINT NOT NULL,
    resource_id BIGINT,
    resource_code VARCHAR(192) NOT NULL DEFAULT '',
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128) NOT NULL DEFAULT '',
    grant_type VARCHAR(32) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_channel_group_resource_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_resource_uuid ON ai_channel_group_resource (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_resource ON ai_channel_group_resource (tenant_id, organization_id, channel_group_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_resource_status ON ai_channel_group_resource (tenant_id, organization_id, status, channel_group_id, grant_type, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_resource_lookup ON ai_channel_group_resource (tenant_id, organization_id, channel_group_id, status, grant_type, priority, id);

CREATE TABLE IF NOT EXISTS ai_channel_resource (
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
    channel_id BIGINT NOT NULL,
    provider_code VARCHAR(64),
    channel_code VARCHAR(64),
    resource_id BIGINT,
    resource_code VARCHAR(192) NOT NULL DEFAULT '',
    resource_group_id BIGINT,
    resource_group_code VARCHAR(128) NOT NULL DEFAULT '',
    grant_type VARCHAR(32) NOT NULL DEFAULT 'allow',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_channel_resource_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_resource_uuid ON ai_channel_resource (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_resource ON ai_channel_resource (tenant_id, organization_id, channel_id, resource_code, resource_group_code);
CREATE INDEX IF NOT EXISTS idx_ai_channel_resource_lookup ON ai_channel_resource (tenant_id, organization_id, status, channel_id, grant_type, priority, id);

CREATE TABLE IF NOT EXISTS ai_config_change_event (
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
    config_scope VARCHAR(64) NOT NULL,
    changed_object_type VARCHAR(64),
    changed_object_id BIGINT,
    config_version BIGINT NOT NULL,
    event_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    event_payload JSONB,
    published_at TIMESTAMPTZ,
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
    config_scope VARCHAR(64) NOT NULL,
    config_version BIGINT NOT NULL DEFAULT 0,
    changed_object_type VARCHAR(64),
    changed_object_id BIGINT,
    published_at TIMESTAMPTZ,
    CONSTRAINT ck_ai_config_version_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_version_uuid ON ai_config_version (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_version_scope ON ai_config_version (tenant_id, organization_id, config_scope);
CREATE INDEX IF NOT EXISTS idx_ai_config_version_scope_updated ON ai_config_version (tenant_id, organization_id, config_scope, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_version_scope_status ON ai_config_version (config_scope, status, deleted_at, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule (
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
    source_vendor_id BIGINT,
    source_vendor_code VARCHAR(64) NOT NULL DEFAULT '',
    target_vendor_id BIGINT,
    target_vendor_code VARCHAR(64) NOT NULL DEFAULT '',
    mapping_mode VARCHAR(32) NOT NULL DEFAULT 'alias',
    match_type VARCHAR(32) NOT NULL DEFAULT 'exact',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_uuid ON ai_model_mapping_rule (uuid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_source_vendor ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, source_vendor_code, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_target_vendor ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, target_vendor_code, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_enabled ON ai_model_mapping_rule (tenant_id, organization_id, status, enabled, id);

CREATE TABLE IF NOT EXISTS ai_model_mapping_rule_binding (
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
    rule_id BIGINT NOT NULL DEFAULT 0,
    rule_uuid VARCHAR(128),
    binding_type VARCHAR(32) NOT NULL DEFAULT 'global',
    binding_id BIGINT,
    binding_code VARCHAR(128),
    binding_name_snapshot VARCHAR(256),
    sort_order INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
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
    rule_id BIGINT NOT NULL DEFAULT 0,
    rule_uuid VARCHAR(128),
    source_model VARCHAR(256) NOT NULL DEFAULT '',
    source_catalog_key VARCHAR(256),
    target_model VARCHAR(256) NOT NULL DEFAULT '',
    target_catalog_key VARCHAR(256),
    target_provider_model VARCHAR(256),
    target_provider_native_model VARCHAR(256),
    sort_order INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_ai_model_mapping_rule_item_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_item_uuid ON ai_model_mapping_rule_item (uuid) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_rule_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, rule_id, status, enabled, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_source_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, source_model, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_target_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, target_catalog_key, target_model, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing_import_snapshot (
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
    import_source INTEGER NOT NULL,
    source_name VARCHAR(128) NOT NULL,
    source_url VARCHAR(1024),
    source_version VARCHAR(128),
    source_hash VARCHAR(128) NOT NULL,
    upstream_commit VARCHAR(128),
    data_format VARCHAR(64),
    row_count BIGINT,
    accepted_count BIGINT,
    rejected_count BIGINT,
    currency VARCHAR(10),
    published_at TIMESTAMPTZ,
    observed_at TIMESTAMPTZ NOT NULL,
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
    plan_code VARCHAR(64) NOT NULL,
    plan_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    plan_scope INTEGER,
    base_price_side INTEGER NOT NULL,
    base_pricing_scope INTEGER,
    default_reference_price_id BIGINT,
    default_multiplier NUMERIC(38, 12),
    default_markup_amount NUMERIC(38, 12),
    currency VARCHAR(10) NOT NULL,
    billing_mode INTEGER,
    rounding_mode INTEGER,
    min_charge_amount NUMERIC(38, 12),
    fallback_mode INTEGER,
    priority INTEGER,
    price_version VARCHAR(64),
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_plan_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
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
    pricing_plan_id BIGINT NOT NULL,
    pricing_plan_code VARCHAR(64),
    subject_type INTEGER NOT NULL,
    subject_id BIGINT,
    subject_code VARCHAR(128),
    binding_source INTEGER,
    multiplier_override NUMERIC(38, 12),
    rpm_override BIGINT,
    tpm_override BIGINT,
    quota_policy_id BIGINT,
    priority INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_plan_binding_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_uuid ON ai_pricing_plan_binding (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_subject ON ai_pricing_plan_binding (tenant_id, organization_id, subject_type, subject_id, pricing_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_tenant_status_effective ON ai_pricing_plan_binding (tenant_id, organization_id, status, effective_from, priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_subject_effective ON ai_pricing_plan_binding (tenant_id, organization_id, subject_type, subject_id, status, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_plan_binding_plan ON ai_pricing_plan_binding (tenant_id, organization_id, pricing_plan_id, status, priority, id);

CREATE TABLE IF NOT EXISTS ai_pricing_rule (
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
    pricing_plan_id BIGINT NOT NULL,
    pricing_plan_code VARCHAR(64),
    rule_code VARCHAR(64) NOT NULL,
    rule_name VARCHAR(128),
    match_type INTEGER,
    vendor_code VARCHAR(64),
    family_code VARCHAR(64),
    model_id BIGINT,
    model VARCHAR(256),
    provider_code VARCHAR(64),
    channel_id BIGINT,
    provider_model VARCHAR(256),
    capability_code VARCHAR(64),
    platform_code VARCHAR(64),
    service_tier VARCHAR(64),
    region VARCHAR(64),
    price_side INTEGER,
    reference_price_side INTEGER,
    reference_pricing_id BIGINT,
    reference_pricing_scope INTEGER,
    price_item_type INTEGER,
    billing_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id BIGINT,
    billing_meter_code VARCHAR(64) NOT NULL,
    unit INTEGER,
    unit_size NUMERIC(38, 12),
    metering_mode INTEGER,
    quantity_source INTEGER,
    quantity_formula TEXT,
    result_selector VARCHAR(256),
    minimum_quantity NUMERIC(38, 12),
    quantity_step NUMERIC(38, 12),
    included_quantity NUMERIC(38, 12),
    formula_mode INTEGER NOT NULL,
    multiplier NUMERIC(38, 12),
    markup_amount NUMERIC(38, 12),
    unit_price_override NUMERIC(38, 12),
    expression TEXT,
    expression_hash VARCHAR(128),
    fallback_mode INTEGER,
    priority INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
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
    pricing_rule_id BIGINT NOT NULL,
    model_pricing_id BIGINT,
    tier_code VARCHAR(64) NOT NULL,
    tier_label VARCHAR(64),
    price_item_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id BIGINT,
    billing_meter_code VARCHAR(64) NOT NULL,
    min_quantity NUMERIC(38, 12),
    max_quantity NUMERIC(38, 12),
    quantity_unit INTEGER,
    quantity_step NUMERIC(38, 12),
    included_quantity NUMERIC(38, 12),
    result_selector VARCHAR(256),
    input_unit_price NUMERIC(38, 12),
    output_unit_price NUMERIC(38, 12),
    cache_write_unit_price NUMERIC(38, 12),
    cache_read_unit_price NUMERIC(38, 12),
    image_unit_price NUMERIC(38, 12),
    audio_unit_price NUMERIC(38, 12),
    video_unit_price NUMERIC(38, 12),
    per_request_price NUMERIC(38, 12),
    multiplier NUMERIC(38, 12),
    currency VARCHAR(10),
    sort_order INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_pricing_tier_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
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
    provider_code VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    icon_drive_uri VARCHAR(512),
    icon_resource_snapshot JSONB,
    color_token VARCHAR(64),
    docs_url VARCHAR(512),
    website_url VARCHAR(512),
    default_vendor_code VARCHAR(64),
    provider_type VARCHAR(32),
    protocol_code VARCHAR(64),
    base_url VARCHAR(512),
    auth_type INTEGER,
    resource_schema JSONB,
    metadata_schema_version VARCHAR(32),
    sort_order INTEGER,
    CONSTRAINT ck_ai_provider_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_uuid ON ai_provider (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_tenant_code ON ai_provider (tenant_id, organization_id, provider_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_provider_status_sort ON ai_provider (tenant_id, organization_id, status, sort_order, id);

CREATE TABLE IF NOT EXISTS ai_provider_object_route (
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
    api_key_id BIGINT,
    channel_group_id BIGINT,
    object_type VARCHAR(64) NOT NULL,
    object_id VARCHAR(256) NOT NULL,
    object_key_hash VARCHAR(128) NOT NULL,
    parent_object_type VARCHAR(64),
    parent_object_id VARCHAR(256),
    provider_code VARCHAR(64),
    channel_id BIGINT NOT NULL,
    vendor_code VARCHAR(64),
    api_code VARCHAR(128),
    catalog_key VARCHAR(256),
    provider_model VARCHAR(256),
    region_code VARCHAR(64),
    sticky_scope VARCHAR(64),
    expires_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
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
    policy_code VARCHAR(64),
    name VARCHAR(128),
    subject_type INTEGER,
    subject_id BIGINT,
    subject_ref_hash VARCHAR(128),
    subject_ref_masked VARCHAR(128),
    scope_type INTEGER,
    scope_id BIGINT,
    channel_group_id BIGINT,
    model VARCHAR(256),
    quota_period INTEGER,
    quota_unit INTEGER,
    quota_limit NUMERIC(38, 12),
    requests_per_second BIGINT,
    requests_per_minute BIGINT,
    requests_per_day BIGINT,
    tokens_per_minute BIGINT,
    burst_limit NUMERIC(38, 12),
    block_duration_seconds BIGINT,
    reset_mode INTEGER,
    exhausted_at TIMESTAMPTZ,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_ai_quota_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_quota_policy_tenant_subject ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_subject_ref ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_model_channel_group ON ai_quota_policy (tenant_id, organization_id, model, channel_group_id, status);

CREATE TABLE IF NOT EXISTS ai_request_trace (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempt_no INTEGER NOT NULL,
    decision_log_id BIGINT,
    api_key_id BIGINT,
    legacy_api_key_id BIGINT,
    api_key_name_snapshot VARCHAR(128),
    channel_group_id BIGINT,
    channel_group_snapshot VARCHAR(128),
    owner_type INTEGER,
    owner_id BIGINT,
    owner_name_snapshot VARCHAR(128),
    provider_id BIGINT,
    channel_id BIGINT,
    channel_name_snapshot VARCHAR(128),
    requested_model VARCHAR(256),
    requested_model_catalog_key VARCHAR(256),
    provider_model VARCHAR(256),
    provider_native_model VARCHAR(256),
    gateway_instance_id BIGINT,
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
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    latency_ms INTEGER,
    ttft_ms INTEGER,
    streaming BOOLEAN,
    request_bytes BIGINT,
    response_bytes BIGINT,
    prompt_tokens BIGINT,
    completion_tokens BIGINT,
    cached_tokens BIGINT,
    total_tokens BIGINT,
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
    api_key_id BIGINT,
    legacy_api_key_id BIGINT,
    policy_id BIGINT,
    profile_id BIGINT,
    rule_id BIGINT,
    requested_model VARCHAR(256),
    resolved_model VARCHAR(256),
    capability INTEGER,
    selected_provider_id BIGINT,
    selected_channel_id BIGINT,
    selected_account_id BIGINT,
    decision_mode INTEGER,
    decision_reason JSONB,
    candidate_snapshot JSONB,
    fallback_chain JSONB,
    decision_latency_ms INTEGER,
    CONSTRAINT ck_ai_routing_decision_log_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_decision_log_request ON ai_routing_decision_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_tenant_model_created ON ai_routing_decision_log (tenant_id, organization_id, requested_model, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_log_retention ON ai_routing_decision_log (retention_until, id);

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
    candidate_channels JSONB,
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

CREATE TABLE IF NOT EXISTS ai_site (
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
    site_code VARCHAR(64) NOT NULL,
    site_name VARCHAR(128) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(1024),
    base_url VARCHAR(512),
    website_url VARCHAR(512),
    docs_url VARCHAR(512),
    logo_drive_uri VARCHAR(512),
    logo_resource_snapshot JSONB,
    color_token VARCHAR(64),
    site_type VARCHAR(32) NOT NULL DEFAULT 'relay',
    owner_kind VARCHAR(32),
    region_code VARCHAR(64),
    environment INTEGER NOT NULL DEFAULT 1,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count BIGINT NOT NULL DEFAULT 0,
    last_checked_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 100,
    CONSTRAINT ck_ai_site_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_uuid ON ai_site (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_tenant_code ON ai_site (tenant_id, organization_id, site_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_site_status_sort ON ai_site (tenant_id, organization_id, status, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_site_health_status ON ai_site (tenant_id, organization_id, status, health_status, id);

CREATE TABLE IF NOT EXISTS ai_site_service (
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
    site_id BIGINT NOT NULL,
    site_code VARCHAR(64) NOT NULL,
    service_code VARCHAR(64) NOT NULL,
    service_name VARCHAR(128) NOT NULL,
    service_type VARCHAR(64) NOT NULL DEFAULT 'ai_model_relay',
    protocol_code VARCHAR(64),
    base_url VARCHAR(512),
    auth_type INTEGER NOT NULL DEFAULT 1,
    credential_profile INTEGER NOT NULL DEFAULT 1,
    auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    credential_ref VARCHAR(512),
    credential_hash VARCHAR(128),
    masked_label VARCHAR(128),
    credential_version BIGINT NOT NULL DEFAULT 1,
    region_code VARCHAR(64),
    environment INTEGER NOT NULL DEFAULT 1,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count BIGINT NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
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
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    idempotency_key VARCHAR(128) NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    decision_log_id BIGINT,
    api_key_id BIGINT,
    legacy_api_key_id BIGINT,
    api_key_name_snapshot VARCHAR(128),
    channel_group_id BIGINT,
    channel_group_snapshot VARCHAR(128),
    owner_type INTEGER,
    owner_id BIGINT,
    owner_name_snapshot VARCHAR(128),
    catalog_key VARCHAR(256) NOT NULL,
    requested_model_catalog_key VARCHAR(256),
    model VARCHAR(256),
    provider_native_model VARCHAR(256),
    region_code VARCHAR(64),
    provider_id BIGINT,
    channel_id BIGINT,
    modality INTEGER,
    usage_type INTEGER NOT NULL,
    billing_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id BIGINT,
    billing_meter_code VARCHAR(64) NOT NULL,
    billing_tier VARCHAR(64),
    billable_quantity NUMERIC(38, 12) NOT NULL,
    billable_unit INTEGER,
    prompt_tokens BIGINT,
    completion_tokens BIGINT,
    cached_tokens BIGINT,
    total_tokens BIGINT,
    request_count BIGINT,
    result_count BIGINT,
    item_count BIGINT,
    character_count BIGINT,
    image_count BIGINT,
    audio_seconds NUMERIC(38, 12),
    video_seconds NUMERIC(38, 12),
    storage_byte_hours NUMERIC(38, 12),
    bandwidth_bytes BIGINT,
    base_input_unit_price NUMERIC(38, 12),
    base_output_unit_price NUMERIC(38, 12),
    cache_read_unit_price NUMERIC(38, 12),
    rate_multiplier NUMERIC(38, 12),
    reference_multiplier NUMERIC(38, 12),
    official_reference_amount NUMERIC(38, 12),
    upstream_cost_amount NUMERIC(38, 12),
    customer_charge_amount NUMERIC(38, 12),
    currency VARCHAR(10) NOT NULL,
    pricing_id BIGINT,
    pricing_plan_id BIGINT,
    pricing_plan_code VARCHAR(64),
    pricing_rule_id BIGINT,
    pricing_tier_id BIGINT,
    pricing_snapshot JSONB,
    reasoning_effort VARCHAR(64),
    occurred_at TIMESTAMPTZ NOT NULL,
    settlement_status INTEGER NOT NULL,
    settlement_id BIGINT,
    CONSTRAINT ck_ai_usage_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
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
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    idempotency_key VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    usage_fact_id BIGINT NOT NULL,
    edge_id BIGINT NOT NULL,
    edge_depth INTEGER NOT NULL,
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    amount_role VARCHAR(64) NOT NULL,
    pricing_plan_id BIGINT,
    pricing_rule_id BIGINT,
    billing_meter_code VARCHAR(64),
    token_kind VARCHAR(64),
    billable_quantity NUMERIC(38, 12) NOT NULL,
    unit_price NUMERIC(38, 12),
    unit_size NUMERIC(38, 12),
    charge_amount NUMERIC(38, 12) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    fx_rate_snapshot NUMERIC(38, 12),
    settlement_currency VARCHAR(10),
    converted_charge_amount NUMERIC(38, 12),
    seller_snapshot JSONB,
    buyer_snapshot JSONB,
    price_snapshot JSONB,
    occurred_at TIMESTAMPTZ NOT NULL,
    settlement_status INTEGER,
    CONSTRAINT ck_ai_usage_service_provider_edge_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
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
    legacy_api_key_id BIGINT,
    channel_group_id BIGINT,
    name VARCHAR(128),
    key_prefix VARCHAR(32),
    key_display_masked VARCHAR(64),
    key_hash VARCHAR(128),
    hash_alg VARCHAR(32),
    secret_version BIGINT,
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
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_legacy ON iam_gateway_api_key (legacy_api_key_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_idempotency ON iam_gateway_api_key (tenant_id, idempotency_key) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_scope_id ON iam_gateway_api_key (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_tenant_user_status ON iam_gateway_api_key (tenant_id, organization_id, user_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_ai_channel_group_status ON iam_gateway_api_key (tenant_id, organization_id, channel_group_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key_channel_group (
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
    channel_group_id BIGINT NOT NULL DEFAULT 0,
    channel_group_code VARCHAR(64),
    binding_role VARCHAR(32) NOT NULL DEFAULT 'route',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'auto',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
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
