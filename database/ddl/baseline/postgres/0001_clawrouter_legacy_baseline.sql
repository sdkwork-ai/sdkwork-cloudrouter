-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.
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
    risk_level INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_uuid ON ai_channel (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_tenant_code ON ai_channel (tenant_id, organization_id, channel_code);
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
    last_used_at TIMESTAMPTZ
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
    allowed_origin JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_uuid ON ai_channel_group (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_tenant_code ON ai_channel_group (tenant_id, organization_id, group_code);
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
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_member_uuid ON ai_channel_group_member (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_member_status ON ai_channel_group_member (tenant_id, organization_id, status, channel_group_id, priority, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_member ON ai_channel_group_member (tenant_id, organization_id, channel_group_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_member_group ON ai_channel_group_member (tenant_id, organization_id, channel_group_id, status, priority, weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_member_channel ON ai_channel_group_member (tenant_id, organization_id, channel_id, status, id);

CREATE TABLE IF NOT EXISTS ai_channel_group_metric_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    channel_group_id BIGINT,
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
    snapshot_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_metric_snapshot_uuid ON ai_channel_group_metric_snapshot (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_metric_tenant_status ON ai_channel_group_metric_snapshot (tenant_id, organization_id, status, snapshot_at, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_metric_snapshot ON ai_channel_group_metric_snapshot (tenant_id, organization_id, channel_group_id, snapshot_at);
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
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_resource_uuid ON ai_channel_group_resource (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_channel_group_resource_status ON ai_channel_group_resource (tenant_id, organization_id, status, channel_group_id, grant_type, priority, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_group_resource ON ai_channel_group_resource (tenant_id, organization_id, channel_group_id, resource_code, resource_group_code);
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
    effective_to TIMESTAMPTZ
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
    last_error_message VARCHAR(512)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_change_event_uuid ON ai_config_change_event (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_pending ON ai_config_change_event (tenant_id, organization_id, event_status, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_scope_version ON ai_config_change_event (tenant_id, organization_id, config_scope, config_version, id);

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
    published_at TIMESTAMPTZ
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
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_uuid ON ai_model_mapping_rule (uuid);
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
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_binding_uuid ON ai_model_mapping_rule_binding (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_binding_target ON ai_model_mapping_rule_binding (tenant_id, organization_id, rule_id, binding_type, binding_id, binding_code);
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
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_model_mapping_rule_item_uuid ON ai_model_mapping_rule_item (uuid);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_rule_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, rule_id, status, enabled, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_source_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, source_model, status, enabled, id);
CREATE INDEX IF NOT EXISTS idx_ai_model_mapping_rule_item_target_lookup ON ai_model_mapping_rule_item (tenant_id, organization_id, target_catalog_key, target_model, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing_import_snapshot (
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
    error_message_masked VARCHAR(1024)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_import_snapshot_uuid ON ai_pricing_import_snapshot (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_import_snapshot_hash ON ai_pricing_import_snapshot (tenant_id, organization_id, import_source, source_hash);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_import_snapshot_tenant_latest ON ai_pricing_import_snapshot (tenant_id, organization_id, status, import_source, observed_at, id);

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
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_uuid ON ai_pricing_plan (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_tenant_code ON ai_pricing_plan (tenant_id, organization_id, plan_code);
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
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_uuid ON ai_pricing_plan_binding (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_binding_subject ON ai_pricing_plan_binding (tenant_id, organization_id, subject_type, subject_id, pricing_plan_id);
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
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_uuid ON ai_pricing_rule (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_plan_code ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, rule_code);
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
    pricing_rule_id BIGINT,
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
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_tier_uuid ON ai_pricing_tier (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_tier_rule_code ON ai_pricing_tier (tenant_id, organization_id, pricing_rule_id, tier_code);
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
    sort_order INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_uuid ON ai_provider (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_tenant_code ON ai_provider (tenant_id, organization_id, provider_code);
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
    last_seen_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_object_route_uuid ON ai_provider_object_route (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_object_route_object ON ai_provider_object_route (tenant_id, organization_id, object_type, object_id);
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
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_quota_policy_tenant_subject ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit);
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_subject_ref ON ai_quota_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);
CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_model_channel_group ON ai_quota_policy (tenant_id, organization_id, model, channel_group_id, status);

CREATE TABLE IF NOT EXISTS ai_request_trace (
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
    attempt_no INTEGER,
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
    region_code VARCHAR(64),
    endpoint VARCHAR(256),
    request_path VARCHAR(256),
    http_method VARCHAR(16),
    http_status INTEGER,
    provider_error_code VARCHAR(128),
    error_type INTEGER,
    started_at TIMESTAMPTZ,
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
    user_agent_hash VARCHAR(128)
) PARTITION BY RANGE (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_request_trace_request_attempt ON ai_request_trace (tenant_id, organization_id, request_id, attempt_no);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_trace ON ai_request_trace (tenant_id, organization_id, trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_api_key_started ON ai_request_trace (tenant_id, organization_id, api_key_id, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_model_started ON ai_request_trace (tenant_id, organization_id, requested_model, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_status_started ON ai_request_trace (tenant_id, organization_id, status, started_at, id);
CREATE TABLE IF NOT EXISTS ai_request_trace_default PARTITION OF ai_request_trace DEFAULT;

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
    decision_latency_ms INTEGER
) PARTITION BY RANGE (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_decision_log_request ON ai_routing_decision_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_tenant_model_created ON ai_routing_decision_log (tenant_id, organization_id, requested_model, created_at, id);
CREATE TABLE IF NOT EXISTS ai_routing_decision_log_default PARTITION OF ai_routing_decision_log DEFAULT;

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
    policy_code VARCHAR(64),
    name VARCHAR(128),
    policy_scope INTEGER,
    subject_id BIGINT,
    capability INTEGER,
    default_profile_id BIGINT,
    fallback_mode INTEGER,
    slo_latency_ms INTEGER,
    slo_success_rate NUMERIC(38, 12),
    cost_ceiling NUMERIC(38, 12),
    currency VARCHAR(10)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_tenant_code ON ai_routing_policy (tenant_id, organization_id, policy_code);

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
    policy_id BIGINT,
    profile_version BIGINT,
    profile_name VARCHAR(128),
    release_status INTEGER,
    traffic_percent NUMERIC(38, 12),
    config_hash VARCHAR(128),
    published_at TIMESTAMPTZ,
    published_by BIGINT,
    rollback_from_profile_id BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_policy_version ON ai_routing_profile (policy_id, profile_version);

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
    profile_id BIGINT,
    rule_code VARCHAR(64),
    priority INTEGER,
    match_expression JSONB,
    target_model VARCHAR(256),
    candidate_channels JSONB,
    fallback_chain JSONB,
    constraints JSONB,
    rate_limit_policy_id BIGINT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_rule_profile_code ON ai_routing_rule (profile_id, rule_code);
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
    sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_uuid ON ai_site (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_tenant_code ON ai_site (tenant_id, organization_id, site_code);
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
    sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_service_uuid ON ai_site_service (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_site_service_site_code ON ai_site_service (tenant_id, organization_id, site_id, service_code);
CREATE INDEX IF NOT EXISTS idx_ai_site_service_site_status ON ai_site_service (tenant_id, organization_id, site_id, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_site_service_type_status ON ai_site_service (tenant_id, organization_id, service_type, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_site_service_health_status ON ai_site_service (tenant_id, organization_id, status, health_status, id);

CREATE TABLE IF NOT EXISTS ai_usage_fact (
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
    usage_type INTEGER,
    billing_type INTEGER,
    billing_mode INTEGER,
    billing_meter_id BIGINT,
    billing_meter_code VARCHAR(64),
    billing_tier VARCHAR(64),
    billable_quantity NUMERIC(38, 12),
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
    unit_price_snapshot NUMERIC(38, 12),
    base_input_unit_price NUMERIC(38, 12),
    base_output_unit_price NUMERIC(38, 12),
    cache_read_unit_price NUMERIC(38, 12),
    rate_multiplier NUMERIC(38, 12),
    reference_multiplier NUMERIC(38, 12),
    official_reference_amount NUMERIC(38, 12),
    upstream_cost_amount NUMERIC(38, 12),
    customer_charge_amount NUMERIC(38, 12),
    cost_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    pricing_id BIGINT,
    pricing_plan_id BIGINT,
    pricing_plan_code VARCHAR(64),
    pricing_rule_id BIGINT,
    pricing_tier_id BIGINT,
    pricing_snapshot JSONB,
    reasoning_effort VARCHAR(64),
    occurred_at TIMESTAMPTZ,
    settlement_status INTEGER,
    settlement_id BIGINT
) PARTITION BY RANGE (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_fact_request ON ai_usage_fact (tenant_id, organization_id, request_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_fact_tenant_owner_occurred ON ai_usage_fact (tenant_id, organization_id, owner_type, owner_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_fact_api_key_occurred ON ai_usage_fact (tenant_id, organization_id, api_key_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_fact_model_occurred ON ai_usage_fact (tenant_id, organization_id, catalog_key, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_fact_pricing_plan_occurred ON ai_usage_fact (tenant_id, organization_id, pricing_plan_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_fact_meter_occurred ON ai_usage_fact (tenant_id, organization_id, billing_meter_code, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_fact_settlement_status ON ai_usage_fact (tenant_id, organization_id, settlement_status, occurred_at, id);
CREATE TABLE IF NOT EXISTS ai_usage_fact_default PARTITION OF ai_usage_fact DEFAULT;

CREATE TABLE IF NOT EXISTS ai_usage_service_provider_edge (
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
    usage_fact_id BIGINT NOT NULL,
    edge_id BIGINT NOT NULL,
    edge_depth INTEGER,
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    amount_role VARCHAR(64),
    pricing_plan_id BIGINT,
    pricing_rule_id BIGINT,
    billing_meter_code VARCHAR(64),
    token_kind VARCHAR(64),
    billable_quantity NUMERIC(38, 12),
    unit_price NUMERIC(38, 12),
    unit_size NUMERIC(38, 12),
    charge_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    fx_rate_snapshot NUMERIC(38, 12),
    settlement_currency VARCHAR(10),
    converted_charge_amount NUMERIC(38, 12),
    seller_snapshot JSONB,
    buyer_snapshot JSONB,
    price_snapshot JSONB,
    occurred_at TIMESTAMPTZ,
    settlement_status INTEGER
) PARTITION BY RANGE (created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_service_provider_edge_usage_depth ON ai_usage_service_provider_edge (tenant_id, organization_id, usage_fact_id, edge_depth, amount_role);
CREATE INDEX IF NOT EXISTS idx_ai_usage_service_provider_edge_seller_time ON ai_usage_service_provider_edge (tenant_id, organization_id, seller_provider_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_service_provider_edge_buyer_time ON ai_usage_service_provider_edge (tenant_id, organization_id, buyer_provider_id, occurred_at, id);
CREATE TABLE IF NOT EXISTS ai_usage_service_provider_edge_default PARTITION OF ai_usage_service_provider_edge DEFAULT;

CREATE TABLE IF NOT EXISTS analytics_service_provider_daily (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider_id BIGINT,
    ancestor_provider_id BIGINT,
    report_date DATE,
    currency VARCHAR(10),
    request_count BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    token_count BIGINT,
    income_amount NUMERIC(38, 12),
    expense_amount NUMERIC(38, 12),
    margin_amount NUMERIC(38, 12),
    upstream_cost_amount NUMERIC(38, 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_analytics_service_provider_daily ON analytics_service_provider_daily (tenant_id, organization_id, provider_id, ancestor_provider_id, report_date, currency);

CREATE TABLE IF NOT EXISTS analytics_service_provider_edge_daily (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    edge_id BIGINT,
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    report_date DATE,
    model VARCHAR(128),
    catalog_key VARCHAR(256),
    billing_meter_code VARCHAR(64),
    token_kind VARCHAR(64),
    currency VARCHAR(10),
    request_count BIGINT,
    token_count BIGINT,
    income_amount NUMERIC(38, 12),
    expense_amount NUMERIC(38, 12),
    margin_amount NUMERIC(38, 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_analytics_service_provider_edge_daily ON analytics_service_provider_edge_daily (tenant_id, organization_id, edge_id, report_date, model, billing_meter_code, token_kind, currency);

CREATE TABLE IF NOT EXISTS c_category (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    v BIGINT NOT NULL DEFAULT 0,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    category_type VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(128),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    icon_drive_uri VARCHAR(512),
    icon_resource_snapshot JSONB,
    sort_weight INTEGER NOT NULL DEFAULT 0,
    parent_id BIGINT,
    path VARCHAR(1024),
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    status INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_c_category_type_scope ON c_category (tenant_id, organization_id, category_type, status, sort_weight, id);
CREATE INDEX IF NOT EXISTS idx_c_category_parent ON c_category (tenant_id, organization_id, category_type, parent_id, sort_weight, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_c_category_code ON c_category (tenant_id, organization_id, category_type, code);

CREATE TABLE IF NOT EXISTS commerce_service_provider_exposure_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    service_provider_id BIGINT,
    balance_amount NUMERIC(38, 12),
    frozen_amount NUMERIC(38, 12),
    credit_limit_amount NUMERIC(38, 12),
    used_credit_amount NUMERIC(38, 12),
    exposure_amount NUMERIC(38, 12),
    pending_settlement_amount NUMERIC(38, 12),
    overdue_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    risk_status VARCHAR(64),
    calculated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_service_provider_exposure_snapshot_provider ON commerce_service_provider_exposure_snapshot (tenant_id, organization_id, service_provider_id, currency);

CREATE TABLE IF NOT EXISTS commerce_usage_service_provider_adjustment (
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
    adjustment_no VARCHAR(128),
    usage_edge_id BIGINT,
    statement_id BIGINT,
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    adjustment_type VARCHAR(64),
    amount NUMERIC(38, 12),
    currency VARCHAR(10),
    reason_code VARCHAR(128),
    reason_message VARCHAR(512),
    approval_status VARCHAR(32),
    approved_by BIGINT,
    settled_ledger_entry_id VARCHAR(128)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_usage_service_provider_adjustment_no ON commerce_usage_service_provider_adjustment (tenant_id, organization_id, adjustment_no);
CREATE INDEX IF NOT EXISTS idx_commerce_usage_service_provider_adjustment_edge ON commerce_usage_service_provider_adjustment (tenant_id, organization_id, usage_edge_id, status, id);

CREATE TABLE IF NOT EXISTS commerce_usage_service_provider_reconciliation_item (
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
    run_id BIGINT,
    usage_edge_id BIGINT,
    usage_fact_id BIGINT,
    provider_invoice_item_id BIGINT,
    statement_item_id BIGINT,
    match_status VARCHAR(64),
    internal_amount NUMERIC(38, 12),
    external_amount NUMERIC(38, 12),
    difference_amount NUMERIC(38, 12),
    reason_code VARCHAR(128),
    resolution_status VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_commerce_usage_service_provider_reconciliation_item_run ON commerce_usage_service_provider_reconciliation_item (tenant_id, organization_id, run_id, match_status, id);

CREATE TABLE IF NOT EXISTS commerce_usage_service_provider_reconciliation_run (
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
    run_no VARCHAR(128),
    scope_type VARCHAR(64),
    scope_id VARCHAR(128),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    matched_count BIGINT,
    mismatch_count BIGINT,
    missing_internal_count BIGINT,
    missing_external_count BIGINT,
    total_internal_amount NUMERIC(38, 12),
    total_external_amount NUMERIC(38, 12),
    difference_amount NUMERIC(38, 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_usage_service_provider_reconciliation_run_no ON commerce_usage_service_provider_reconciliation_run (tenant_id, organization_id, run_no);
CREATE INDEX IF NOT EXISTS idx_commerce_usage_service_provider_reconciliation_run_period ON commerce_usage_service_provider_reconciliation_run (tenant_id, organization_id, scope_type, period_start, period_end, id);

CREATE TABLE IF NOT EXISTS commerce_usage_service_provider_statement (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    statement_no VARCHAR(128),
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    period VARCHAR(32),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    total_requests BIGINT,
    total_tokens BIGINT,
    receivable_amount NUMERIC(38, 12),
    payable_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    statement_status INTEGER,
    payment_status INTEGER,
    invoice_id BIGINT,
    generated_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_usage_service_provider_statement_edge_period ON commerce_usage_service_provider_statement (tenant_id, organization_id, seller_provider_id, buyer_provider_id, period);
CREATE INDEX IF NOT EXISTS idx_commerce_usage_service_provider_statement_status ON commerce_usage_service_provider_statement (tenant_id, organization_id, statement_status, period_end, id);

CREATE TABLE IF NOT EXISTS commerce_usage_settlement (
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
    settlement_no VARCHAR(128),
    usage_fact_id BIGINT,
    account_id VARCHAR(64),
    account_ledger_entry_id VARCHAR(64),
    order_id BIGINT,
    payment_id BIGINT,
    asset_type VARCHAR(32),
    direction VARCHAR(16),
    amount NUMERIC(38, 12),
    points BIGINT,
    tokens BIGINT,
    currency VARCHAR(10),
    price_snapshot JSONB,
    settlement_status INTEGER,
    settled_at TIMESTAMPTZ,
    failure_code VARCHAR(128),
    failure_message VARCHAR(512)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_usage_settlement_usage ON commerce_usage_settlement (tenant_id, organization_id, usage_fact_id);
CREATE INDEX IF NOT EXISTS idx_commerce_usage_settlement_tenant_status ON commerce_usage_settlement (tenant_id, organization_id, settlement_status, created_at, id);

CREATE TABLE IF NOT EXISTS commerce_usage_statement (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    statement_no VARCHAR(128),
    period VARCHAR(32),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    owner_type INTEGER,
    owner_id BIGINT,
    total_tokens BIGINT,
    total_requests BIGINT,
    total_cost NUMERIC(38, 12),
    currency VARCHAR(10),
    statement_status INTEGER,
    generated_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_status INTEGER,
    invoice_id BIGINT,
    export_id BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_commerce_usage_statement_owner_period ON commerce_usage_statement (tenant_id, organization_id, owner_type, owner_id, period);
CREATE INDEX IF NOT EXISTS idx_commerce_usage_statement_tenant_status ON commerce_usage_statement (tenant_id, organization_id, statement_status, period_end, id);

CREATE TABLE IF NOT EXISTS commerce_usage_statement_item (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    statement_id BIGINT,
    item_type INTEGER,
    modality INTEGER,
    model VARCHAR(128),
    model_list JSONB,
    provider_code VARCHAR(64),
    usage_text VARCHAR(256),
    breakdown_payload JSONB,
    request_count BIGINT,
    token_count BIGINT,
    asset_count BIGINT,
    duration_seconds NUMERIC(38, 12),
    cost_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    source_usage_fact_ids JSONB
);

CREATE INDEX IF NOT EXISTS idx_commerce_usage_statement_item_statement ON commerce_usage_statement_item (statement_id, item_type, model);

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
    effective_to TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_tenant_subject_status ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_access_policy_subject_ref ON iam_gateway_access_policy (tenant_id, organization_id, subject_type, subject_ref_hash, status);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    owner_type INTEGER,
    owner_id BIGINT,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
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
    revoked_by BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_hash ON iam_gateway_api_key (key_hash);
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_legacy ON iam_gateway_api_key (legacy_api_key_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_idempotency ON iam_gateway_api_key (tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_tenant_user_status ON iam_gateway_api_key (tenant_id, organization_id, user_id, status, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_ai_channel_group_status ON iam_gateway_api_key (tenant_id, organization_id, channel_group_id, status, updated_at, id);

CREATE TABLE IF NOT EXISTS iam_gateway_api_key_channel_group (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT NOT NULL,
    owner_type INTEGER,
    owner_id BIGINT,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    api_key_id BIGINT NOT NULL DEFAULT 0,
    channel_group_id BIGINT NOT NULL DEFAULT 0,
    channel_group_code VARCHAR(64),
    binding_role VARCHAR(32) NOT NULL DEFAULT 'route',
    routing_strategy VARCHAR(32) NOT NULL DEFAULT 'auto',
    priority INTEGER NOT NULL DEFAULT 100,
    weight INTEGER NOT NULL DEFAULT 100,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_channel_group_uuid ON iam_gateway_api_key_channel_group (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_channel_group_binding ON iam_gateway_api_key_channel_group (tenant_id, organization_id, api_key_id, channel_group_id, binding_role);
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
    last_hit_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_risk_rule_tenant_target ON iam_gateway_risk_rule (tenant_id, organization_id, rule_type, target_type, target_value);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_scope_priority ON iam_gateway_risk_rule (tenant_id, organization_id, rule_category, scope_type, scope_id, priority, status);
CREATE INDEX IF NOT EXISTS idx_iam_gateway_risk_rule_target_hash ON iam_gateway_risk_rule (tenant_id, organization_id, target_type, target_value_hash, status);

CREATE TABLE IF NOT EXISTS iam_user_login_event (
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
    auth_method INTEGER,
    auth_provider VARCHAR(64),
    login_result INTEGER,
    risk_level INTEGER,
    failure_reason_code VARCHAR(128),
    client_ip_hash VARCHAR(128),
    client_ip_masked VARCHAR(64),
    client_ip_region VARCHAR(128),
    device_fingerprint_hash VARCHAR(128),
    device_label VARCHAR(128),
    user_agent_hash VARCHAR(128),
    mfa_verified BOOLEAN,
    session_id_hash VARCHAR(128),
    occurred_at TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_iam_user_login_event_user_occurred ON iam_user_login_event (tenant_id, organization_id, user_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_iam_user_login_event_result_occurred ON iam_user_login_event (tenant_id, organization_id, login_result, occurred_at, id);
CREATE TABLE IF NOT EXISTS iam_user_login_event_default PARTITION OF iam_user_login_event DEFAULT;

CREATE TABLE IF NOT EXISTS iam_user_preference (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    owner_type INTEGER,
    owner_id BIGINT,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    language VARCHAR(32),
    timezone VARCHAR(64),
    theme_mode INTEGER,
    appearance_config JSONB,
    notification_preferences JSONB,
    default_console_path VARCHAR(256)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_user_preference_user ON iam_user_preference (tenant_id, organization_id, user_id);

CREATE TABLE IF NOT EXISTS iam_user_security_setting (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    owner_type INTEGER,
    owner_id BIGINT,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    mfa_enabled BOOLEAN,
    mfa_method INTEGER,
    password_last_changed_at TIMESTAMPTZ,
    security_level INTEGER,
    trusted_device_count INTEGER,
    last_login_at TIMESTAMPTZ,
    last_login_ip_hash VARCHAR(128),
    third_party_bound_snapshot JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_user_security_setting_user ON iam_user_security_setting (tenant_id, organization_id, user_id);

CREATE TABLE IF NOT EXISTS integration_provider_account (
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
    provider_code VARCHAR(64) NOT NULL DEFAULT '',
    account_code VARCHAR(64) NOT NULL DEFAULT '',
    account_name VARCHAR(128) NOT NULL DEFAULT '',
    account_type VARCHAR(32) NOT NULL DEFAULT 'official',
    channel_type VARCHAR(32) NOT NULL DEFAULT 'official',
    auth_type INTEGER NOT NULL DEFAULT 1,
    credential_profile INTEGER NOT NULL DEFAULT 1,
    auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    secret_ref VARCHAR(512),
    secret_hash VARCHAR(128),
    masked_label VARCHAR(128),
    credential_version BIGINT NOT NULL DEFAULT 1,
    base_url VARCHAR(512),
    region_code VARCHAR(64),
    environment INTEGER NOT NULL DEFAULT 1,
    health_status INTEGER NOT NULL DEFAULT 1,
    last_latency_ms INTEGER,
    consecutive_error_count BIGINT NOT NULL DEFAULT 0,
    risk_level INTEGER NOT NULL DEFAULT 1,
    quota_snapshot JSONB,
    last_verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_rotated_at TIMESTAMPTZ,
    next_rotate_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_provider_account_uuid ON integration_provider_account (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_provider_account_code ON integration_provider_account (tenant_id, organization_id, account_code);
CREATE INDEX IF NOT EXISTS idx_integration_provider_account_provider ON integration_provider_account (tenant_id, organization_id, provider_code, account_type, status, id);
CREATE INDEX IF NOT EXISTS idx_integration_provider_account_secret ON integration_provider_account (tenant_id, organization_id, secret_hash, status, id);
CREATE INDEX IF NOT EXISTS idx_integration_provider_account_health ON integration_provider_account (tenant_id, organization_id, status, health_status, risk_level, id);

CREATE TABLE IF NOT EXISTS integration_provider_health_snapshot (
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
    provider_id BIGINT,
    channel_id BIGINT,
    provider_account_id BIGINT,
    check_type INTEGER,
    health_status INTEGER,
    latency_ms INTEGER,
    http_status INTEGER,
    error_code VARCHAR(128),
    error_message_masked VARCHAR(1024),
    quota_snapshot JSONB,
    checked_at TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_integration_provider_health_provider_time ON integration_provider_health_snapshot (provider_id, checked_at, id);
CREATE INDEX IF NOT EXISTS idx_integration_provider_health_channel_time ON integration_provider_health_snapshot (channel_id, checked_at, id);
CREATE TABLE IF NOT EXISTS integration_provider_health_snapshot_default PARTITION OF integration_provider_health_snapshot DEFAULT;

CREATE TABLE IF NOT EXISTS integration_proxy (
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
    proxy_code VARCHAR(64),
    proxy_type INTEGER,
    endpoint VARCHAR(512),
    secret_ref VARCHAR(256),
    secret_hash VARCHAR(128),
    region VARCHAR(64),
    health_status INTEGER,
    last_checked_at TIMESTAMPTZ,
    description VARCHAR(512)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_proxy_tenant_code ON integration_proxy (tenant_id, organization_id, proxy_code);

CREATE TABLE IF NOT EXISTS integration_service_provider (
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
    provider_no VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    provider_type VARCHAR(64),
    owner_tenant_id BIGINT,
    owner_organization_id BIGINT,
    owner_user_id BIGINT,
    default_currency VARCHAR(10),
    default_timezone VARCHAR(64),
    risk_level INTEGER,
    suspended_reason_code VARCHAR(128),
    activated_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_no ON integration_service_provider (tenant_id, organization_id, provider_no);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_status ON integration_service_provider (tenant_id, organization_id, status, risk_level, id);

CREATE TABLE IF NOT EXISTS integration_service_provider_closure (
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
    ancestor_provider_id BIGINT NOT NULL,
    descendant_provider_id BIGINT NOT NULL,
    depth INTEGER,
    path VARCHAR(2048),
    direct_edge_id BIGINT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_closure_pair ON integration_service_provider_closure (tenant_id, organization_id, ancestor_provider_id, descendant_provider_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_closure_desc ON integration_service_provider_closure (tenant_id, organization_id, descendant_provider_id, depth, status, id);

CREATE TABLE IF NOT EXISTS integration_service_provider_contract (
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
    contract_no VARCHAR(128) NOT NULL,
    edge_id BIGINT NOT NULL,
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    contract_type VARCHAR(64),
    current_version_id BIGINT,
    signed_at TIMESTAMPTZ,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    contract_file_ref VARCHAR(512)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_contract_no ON integration_service_provider_contract (tenant_id, organization_id, contract_no);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_contract_edge ON integration_service_provider_contract (tenant_id, organization_id, edge_id, status, id);

CREATE TABLE IF NOT EXISTS integration_service_provider_edge (
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
    edge_no VARCHAR(64) NOT NULL,
    seller_provider_id BIGINT NOT NULL,
    buyer_provider_id BIGINT NOT NULL,
    edge_type VARCHAR(64),
    contract_no VARCHAR(128),
    settlement_mode VARCHAR(32),
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    contract_snapshot JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_edge_no ON integration_service_provider_edge (tenant_id, organization_id, edge_no);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_edge_seller ON integration_service_provider_edge (tenant_id, organization_id, seller_provider_id, status, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_edge_buyer ON integration_service_provider_edge (tenant_id, organization_id, buyer_provider_id, status, effective_from, id);

CREATE TABLE IF NOT EXISTS integration_service_provider_finance_profile (
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
    service_provider_id BIGINT NOT NULL,
    settlement_mode VARCHAR(32),
    billing_cycle VARCHAR(32),
    settlement_day INTEGER,
    credit_limit_amount NUMERIC(38, 12),
    warning_threshold_amount NUMERIC(38, 12),
    suspend_threshold_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    invoice_title_id BIGINT,
    tax_profile_ref VARCHAR(256),
    payment_terms_days INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_finance_profile ON integration_service_provider_finance_profile (tenant_id, organization_id, service_provider_id);

CREATE TABLE IF NOT EXISTS integration_service_provider_member (
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
    service_provider_id BIGINT NOT NULL,
    member_user_id BIGINT NOT NULL,
    role_code VARCHAR(64),
    permission_policy_id BIGINT,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_member_user ON integration_service_provider_member (tenant_id, organization_id, service_provider_id, member_user_id, role_code);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_member_user ON integration_service_provider_member (tenant_id, organization_id, member_user_id, status, id);

CREATE TABLE IF NOT EXISTS integration_service_provider_price_plan (
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
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    edge_id BIGINT NOT NULL,
    plan_code VARCHAR(64) NOT NULL,
    plan_name VARCHAR(128),
    base_amount_source VARCHAR(64),
    pricing_mode VARCHAR(64),
    default_multiplier NUMERIC(38, 12),
    default_markup_amount NUMERIC(38, 12),
    currency VARCHAR(10),
    fallback_mode VARCHAR(32),
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_price_plan_edge_code ON integration_service_provider_price_plan (tenant_id, organization_id, edge_id, plan_code);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_price_plan_buyer ON integration_service_provider_price_plan (tenant_id, organization_id, buyer_provider_id, status, effective_from, id);

CREATE TABLE IF NOT EXISTS integration_service_provider_price_rule (
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
    seller_provider_id BIGINT,
    buyer_provider_id BIGINT,
    edge_id BIGINT NOT NULL,
    price_plan_id BIGINT NOT NULL,
    catalog_key VARCHAR(256),
    model VARCHAR(256),
    provider_code VARCHAR(64),
    channel_id BIGINT,
    billing_meter_code VARCHAR(64),
    token_kind VARCHAR(64),
    unit_price NUMERIC(38, 12),
    unit_size NUMERIC(38, 12),
    minimum_charge NUMERIC(38, 12),
    rounding_mode VARCHAR(32),
    priority INTEGER,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integration_service_provider_price_rule_lookup ON integration_service_provider_price_rule (tenant_id, organization_id, edge_id, catalog_key, billing_meter_code, token_kind, status, priority);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_price_rule_model ON integration_service_provider_price_rule (tenant_id, organization_id, buyer_provider_id, model, billing_meter_code, token_kind, status);

CREATE TABLE IF NOT EXISTS integration_service_provider_subject_binding (
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
    service_provider_id BIGINT NOT NULL,
    subject_type VARCHAR(64) NOT NULL,
    subject_id BIGINT NOT NULL,
    subject_code VARCHAR(128),
    binding_priority INTEGER,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_service_provider_subject_binding ON integration_service_provider_subject_binding (tenant_id, organization_id, subject_type, subject_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_integration_service_provider_subject_provider ON integration_service_provider_subject_binding (tenant_id, organization_id, service_provider_id, status, binding_priority, id);

CREATE TABLE IF NOT EXISTS integration_webhook_endpoint (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    owner_type INTEGER,
    owner_id BIGINT,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    endpoint_code VARCHAR(64),
    name VARCHAR(128),
    target_url VARCHAR(1024),
    secret_ref VARCHAR(256),
    secret_hash VARCHAR(128),
    event_types JSONB,
    signing_alg VARCHAR(64),
    retry_policy JSONB,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_webhook_endpoint_tenant_code ON integration_webhook_endpoint (tenant_id, organization_id, endpoint_code);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_endpoint_tenant_status ON integration_webhook_endpoint (tenant_id, organization_id, status, updated_at, id);

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
    resolved_by BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_alert_event_no ON ops_alert_event (alert_no);
CREATE INDEX IF NOT EXISTS idx_ops_alert_event_status_severity ON ops_alert_event (alert_status, severity, last_seen_at, id);

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
    approval_id BIGINT
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_operator_created ON ops_audit_log (tenant_id, organization_id, operator_type, operator_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_tenant_target_created ON ops_audit_log (tenant_id, organization_id, target_type, target_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_request ON ops_audit_log (tenant_id, organization_id, request_id);
CREATE TABLE IF NOT EXISTS ops_audit_log_default PARTITION OF ops_audit_log DEFAULT;

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
    rollback_from_snapshot_id BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_config_snapshot_no ON ops_config_snapshot (snapshot_no);
CREATE INDEX IF NOT EXISTS idx_ops_config_snapshot_tenant_scope ON ops_config_snapshot (tenant_id, organization_id, config_scope, config_type, created_at, id);

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
    payload JSONB
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_ops_gateway_heartbeat_instance_time ON ops_gateway_heartbeat (instance_id, heartbeat_at, id);
CREATE TABLE IF NOT EXISTS ops_gateway_heartbeat_default PARTITION OF ops_gateway_heartbeat DEFAULT;

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
    config_hash VARCHAR(128)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_gateway_instance_code ON ops_gateway_instance (instance_code);
CREATE INDEX IF NOT EXISTS idx_ops_gateway_instance_region_status ON ops_gateway_instance (region, cell, health_status, last_heartbeat_at);

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
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_ops_job_execution_name_started ON ops_job_execution (job_name, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_status_started ON ops_job_execution (execution_status, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ops_job_execution_model_ranking_scope_started ON ops_job_execution (tenant_id, organization_id, status, job_type, job_name, started_at, id);

CREATE TABLE IF NOT EXISTS ops_metric_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    source_type VARCHAR(128),
    source_id BIGINT,
    source_version BIGINT,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rebuild_version BIGINT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    metric_scope INTEGER,
    metric_name VARCHAR(128),
    metric_period INTEGER,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    dimension_key VARCHAR(128),
    dimension_value VARCHAR(256),
    metric_value NUMERIC(38, 12),
    metric_unit VARCHAR(64),
    payload JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ops_metric_snapshot ON ops_metric_snapshot (metric_scope, metric_name, metric_period, period_start, dimension_key, dimension_value);

CREATE TABLE IF NOT EXISTS system_installation_state (
    id BIGINT NOT NULL PRIMARY KEY,
    installation_id VARCHAR(64) NOT NULL,
    environment VARCHAR(64) NOT NULL,
    database_engine VARCHAR(32) NOT NULL,
    schema_version VARCHAR(64) NOT NULL,
    catalog_version VARCHAR(128) NOT NULL,
    seed_profile VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    installed_at TIMESTAMPTZ,
    upgraded_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ,
    metadata JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_system_installation_state_installation_id ON system_installation_state (installation_id);
CREATE INDEX IF NOT EXISTS idx_system_installation_state_env_status ON system_installation_state (environment, status, last_checked_at);

CREATE TABLE IF NOT EXISTS system_schema_migration (
    id BIGINT NOT NULL PRIMARY KEY,
    migration_key VARCHAR(128) NOT NULL,
    migration_version VARCHAR(128) NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_system_schema_migration_key ON system_schema_migration (migration_key);
CREATE INDEX IF NOT EXISTS idx_system_schema_migration_status_started ON system_schema_migration (status, started_at, id);
