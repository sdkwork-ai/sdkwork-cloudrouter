-- Generated from docs/schema-registry/sdkwork-clawrouter.tables.yaml.
-- Do not edit by hand; update Schema Registry and regenerate.

CREATE TABLE IF NOT EXISTS ai_channel (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    metadata JSONB,
    channel_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    provider_id BIGINT,
    provider_code VARCHAR(64),
    site_id BIGINT,
    site_code VARCHAR(64),
    channel_name VARCHAR(128),
    channel_type INTEGER,
    auth_type INTEGER,
    auth_secret_ref VARCHAR(256),
    upstream_region VARCHAR(64),
    client_region VARCHAR(64),
    weight INTEGER,
    priority INTEGER,
    health_check_enabled BOOLEAN,
    health_check_interval_seconds INTEGER,
    health_check_timeout_seconds INTEGER,
    health_status INTEGER,
    last_health_check_at TIMESTAMPTZ,
    circuit_breaker_enabled BOOLEAN,
    circuit_breaker_threshold INTEGER,
    circuit_breaker_timeout_seconds INTEGER,
    circuit_state INTEGER,
    rate_limit_enabled BOOLEAN,
    requests_per_second BIGINT,
    requests_per_minute BIGINT,
    quota_enabled BOOLEAN,
    daily_quota BIGINT,
    monthly_quota BIGINT,
    cost_multiplier NUMERIC(38, 12),
    markup_amount NUMERIC(38, 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_code ON ai_channel (tenant_id, organization_id, channel_code);
CREATE INDEX IF NOT EXISTS idx_ai_channel_provider_status ON ai_channel (tenant_id, organization_id, provider_id, status, weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_site_status ON ai_channel (tenant_id, organization_id, site_id, status, weight, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_health_status ON ai_channel (tenant_id, organization_id, health_status, circuit_state, id);

CREATE TABLE IF NOT EXISTS ai_channel_binding (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    idempotency_key VARCHAR(128),
    channel_id BIGINT,
    channel_code VARCHAR(64),
    group_id BIGINT,
    group_code VARCHAR(64),
    binding_priority INTEGER,
    binding_weight INTEGER,
    enabled BOOLEAN,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_binding_group_channel ON ai_channel_binding (tenant_id, organization_id, group_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_binding_group ON ai_channel_binding (tenant_id, organization_id, group_id, binding_priority, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_binding_channel ON ai_channel_binding (tenant_id, organization_id, channel_id, status, id);

CREATE TABLE IF NOT EXISTS ai_channel_metric (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    channel_id BIGINT,
    channel_code VARCHAR(64),
    snapshot_at TIMESTAMPTZ,
    health_status INTEGER,
    circuit_state INTEGER,
    avg_latency_ms INTEGER,
    p50_latency_ms INTEGER,
    p95_latency_ms INTEGER,
    p99_latency_ms INTEGER,
    total_requests BIGINT,
    success_requests BIGINT,
    failed_requests BIGINT,
    success_rate NUMERIC(38, 12),
    daily_quota_used BIGINT,
    daily_quota_remaining BIGINT,
    monthly_quota_used BIGINT,
    monthly_quota_remaining BIGINT,
    total_cost NUMERIC(38, 12),
    avg_cost_per_request NUMERIC(38, 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_metric_snapshot ON ai_channel_metric (tenant_id, organization_id, channel_id, snapshot_at);
CREATE INDEX IF NOT EXISTS idx_ai_channel_metric_channel_time ON ai_channel_metric (tenant_id, organization_id, channel_id, snapshot_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_channel_metric_time ON ai_channel_metric (tenant_id, organization_id, snapshot_at, id);

CREATE TABLE IF NOT EXISTS ai_channel_quota (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    channel_id BIGINT,
    channel_code VARCHAR(64),
    quota_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    quota_type INTEGER,
    quota_period INTEGER,
    quota_limit BIGINT,
    quota_warning_threshold BIGINT,
    quota_hard_limit BIGINT,
    quota_used BIGINT,
    quota_remaining BIGINT,
    quota_status INTEGER,
    reset_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_channel_quota_code ON ai_channel_quota (tenant_id, organization_id, quota_code);
CREATE INDEX IF NOT EXISTS idx_ai_channel_quota_channel ON ai_channel_quota (tenant_id, organization_id, channel_id, quota_type, status, id);

CREATE TABLE IF NOT EXISTS ai_config_change (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    version_id BIGINT,
    version_number BIGINT,
    change_type INTEGER,
    change_scope INTEGER,
    change_target VARCHAR(256),
    before_snapshot JSONB,
    after_snapshot JSONB,
    change_reason VARCHAR(512),
    changed_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_ai_config_change_version ON ai_config_change (tenant_id, organization_id, version_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_config_change_type_time ON ai_config_change (tenant_id, organization_id, change_type, change_scope, created_at, id);

CREATE TABLE IF NOT EXISTS ai_config_version (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    version_number BIGINT,
    version_hash VARCHAR(128),
    config_type INTEGER,
    config_snapshot JSONB,
    change_type INTEGER,
    change_reason VARCHAR(512)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_config_version_number ON ai_config_version (tenant_id, organization_id, config_type, version_number);
CREATE INDEX IF NOT EXISTS idx_ai_config_version_type_time ON ai_config_version (tenant_id, organization_id, config_type, created_at, version_number, id);

CREATE TABLE IF NOT EXISTS ai_group (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    metadata JSONB,
    group_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    group_name VARCHAR(128),
    group_type INTEGER,
    pricing_id BIGINT,
    pricing_code VARCHAR(64),
    quota_policy_id BIGINT,
    quota_policy_code VARCHAR(64),
    routing_policy_id BIGINT,
    routing_policy_code VARCHAR(64),
    fallback_enabled BOOLEAN,
    fallback_group_id BIGINT,
    sticky_session_enabled BOOLEAN,
    sticky_session_ttl_seconds INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_group_code ON ai_group (tenant_id, organization_id, group_code);
CREATE INDEX IF NOT EXISTS idx_ai_group_tenant_status ON ai_group (tenant_id, organization_id, group_type, status, updated_at, id);

CREATE TABLE IF NOT EXISTS ai_group_resource (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    idempotency_key VARCHAR(128),
    group_id BIGINT,
    group_code VARCHAR(64),
    resource_type INTEGER,
    resource_id BIGINT,
    resource_code VARCHAR(128),
    resource_group_id BIGINT,
    permission_mode INTEGER,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_group_resource_group_resource ON ai_group_resource (tenant_id, organization_id, group_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_ai_group_resource_group ON ai_group_resource (tenant_id, organization_id, group_id, permission_mode, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    metadata JSONB,
    pricing_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    pricing_name VARCHAR(128),
    pricing_type INTEGER,
    base_price_source INTEGER,
    base_price_type INTEGER,
    pricing_mode INTEGER,
    default_multiplier NUMERIC(38, 12),
    default_markup_amount NUMERIC(38, 12),
    default_markup_type INTEGER,
    currency VARCHAR(10),
    minimum_charge NUMERIC(38, 12),
    rounding_mode INTEGER,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    binding_scope_type INTEGER,
    binding_scope_id BIGINT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_code ON ai_pricing (tenant_id, organization_id, pricing_code);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tenant_status ON ai_pricing (tenant_id, organization_id, pricing_type, status, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_binding ON ai_pricing (tenant_id, organization_id, binding_scope_type, binding_scope_id, status, id);

CREATE TABLE IF NOT EXISTS ai_pricing_rule (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    metadata JSONB,
    rule_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    pricing_id BIGINT,
    pricing_code VARCHAR(64),
    rule_name VARCHAR(128),
    rule_type INTEGER,
    rule_priority INTEGER,
    match_model_vendor VARCHAR(64),
    match_model_code VARCHAR(128),
    match_model_family VARCHAR(64),
    match_capability_type INTEGER,
    match_billing_meter VARCHAR(64),
    match_token_kind VARCHAR(64),
    match_upstream_region VARCHAR(64),
    match_client_region VARCHAR(64),
    pricing_mode INTEGER,
    multiplier NUMERIC(38, 12),
    fixed_price NUMERIC(38, 12),
    fixed_price_unit VARCHAR(64),
    tier_enabled BOOLEAN,
    tier_config JSONB,
    expression_enabled BOOLEAN,
    expression_formula VARCHAR(512),
    currency VARCHAR(10),
    unit_price NUMERIC(38, 12),
    unit_size NUMERIC(38, 12),
    minimum_charge NUMERIC(38, 12),
    rounding_mode INTEGER,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_code ON ai_pricing_rule (tenant_id, organization_id, rule_code);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_pricing_priority ON ai_pricing_rule (tenant_id, organization_id, pricing_id, rule_priority, status, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_model_meter ON ai_pricing_rule (tenant_id, organization_id, match_model_code, match_billing_meter, match_token_kind, status, rule_priority, id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_rule_capability_meter ON ai_pricing_rule (tenant_id, organization_id, match_capability_type, match_billing_meter, match_token_kind, status, rule_priority, id);

CREATE TABLE IF NOT EXISTS ai_provider_route (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    route_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    provider_id BIGINT,
    provider_code VARCHAR(64),
    object_type VARCHAR(64),
    object_path VARCHAR(256),
    target_url VARCHAR(512),
    target_method VARCHAR(16),
    match_mode INTEGER,
    priority INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_route_code ON ai_provider_route (tenant_id, organization_id, route_code);
CREATE INDEX IF NOT EXISTS idx_ai_provider_route_provider_object ON ai_provider_route (tenant_id, organization_id, provider_id, object_type, object_path, status, id);

CREATE TABLE IF NOT EXISTS ai_request_trace (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER,
    created_at TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN,
    metadata JSONB,
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
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_request_trace_request_attempt ON ai_request_trace (tenant_id, organization_id, request_id, attempt_no);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_trace ON ai_request_trace (tenant_id, organization_id, trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_api_key_started ON ai_request_trace (tenant_id, organization_id, api_key_id, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_model_started ON ai_request_trace (tenant_id, organization_id, requested_model, started_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_request_trace_tenant_status_started ON ai_request_trace (tenant_id, organization_id, status, started_at, id);

CREATE TABLE IF NOT EXISTS ai_routing_log (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER,
    created_at TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    usage_id BIGINT,
    policy_id BIGINT,
    rule_id BIGINT,
    group_id BIGINT,
    selected_channel_id BIGINT,
    selected_channel_code VARCHAR(64),
    selection_reason VARCHAR(512),
    candidate_channels JSONB,
    matched_conditions JSONB,
    decision_at TIMESTAMPTZ,
    decision_duration_ms INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_log_request ON ai_routing_log (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_log_policy_time ON ai_routing_log (tenant_id, organization_id, policy_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_log_channel_time ON ai_routing_log (tenant_id, organization_id, selected_channel_id, created_at, id);

CREATE TABLE IF NOT EXISTS ai_routing_policy (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    metadata JSONB,
    policy_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    policy_name VARCHAR(128),
    policy_type INTEGER,
    scope_type INTEGER,
    scope_id BIGINT,
    routing_mode INTEGER,
    sticky_session_enabled BOOLEAN,
    sticky_session_ttl_seconds INTEGER,
    fallback_enabled BOOLEAN,
    fallback_policy_id BIGINT,
    weight_based_enabled BOOLEAN,
    priority_based_enabled BOOLEAN
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_code ON ai_routing_policy (tenant_id, organization_id, policy_code);
CREATE INDEX IF NOT EXISTS idx_ai_routing_policy_scope ON ai_routing_policy (tenant_id, organization_id, scope_type, scope_id, status, id);

CREATE TABLE IF NOT EXISTS ai_routing_rule (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    status INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    version BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    rule_code VARCHAR(64),
    idempotency_key VARCHAR(128),
    policy_id BIGINT,
    policy_code VARCHAR(64),
    rule_name VARCHAR(128),
    rule_priority INTEGER,
    match_conditions JSONB,
    candidate_channels JSONB,
    fallback_channels JSONB,
    constraints JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_rule_code ON ai_routing_rule (tenant_id, organization_id, rule_code);
CREATE INDEX IF NOT EXISTS idx_ai_routing_rule_policy ON ai_routing_rule (tenant_id, organization_id, policy_id, rule_priority, status, id);

CREATE TABLE IF NOT EXISTS ai_usage (
    id BIGINT,
    uuid VARCHAR(64),
    tenant_id BIGINT,
    organization_id BIGINT,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    idempotency_key VARCHAR(128),
    status INTEGER,
    created_at TIMESTAMPTZ,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN,
    metadata JSONB,
    group_id BIGINT,
    group_code VARCHAR(64),
    channel_id BIGINT,
    channel_code VARCHAR(64),
    provider_id BIGINT,
    provider_code VARCHAR(64),
    model_vendor VARCHAR(64),
    model_code VARCHAR(128),
    model_family VARCHAR(64),
    capability_type INTEGER,
    operation_type INTEGER,
    billing_mode INTEGER,
    billing_meter VARCHAR(64),
    input_tokens BIGINT,
    output_tokens BIGINT,
    total_tokens BIGINT,
    reasoning_tokens BIGINT,
    cache_read_tokens BIGINT,
    cache_write_tokens BIGINT,
    duration_ms BIGINT,
    ttft_ms INTEGER,
    upstream_latency_ms INTEGER,
    gateway_latency_ms INTEGER,
    upstream_cost NUMERIC(38, 12),
    upstream_currency VARCHAR(10),
    customer_charge NUMERIC(38, 12),
    customer_currency VARCHAR(10),
    settlement_amount NUMERIC(38, 12),
    settlement_currency VARCHAR(10),
    settlement_status INTEGER,
    pricing_id BIGINT,
    pricing_code VARCHAR(64),
    is_streaming BOOLEAN,
    is_idempotent BOOLEAN,
    is_fallback BOOLEAN,
    error_code VARCHAR(64),
    error_type VARCHAR(64),
    error_message VARCHAR(512),
    request_snapshot JSONB,
    response_snapshot JSONB,
    routing_log_id BIGINT,
    sticky_key VARCHAR(128),
    circuit_state INTEGER,
    upstream_region VARCHAR(64),
    client_region VARCHAR(64),
    client_ip_hash VARCHAR(128),
    user_agent_hash VARCHAR(128),
    api_key_id BIGINT,
    api_key_prefix VARCHAR(32),
    processed_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    reconciled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_request ON ai_usage (tenant_id, organization_id, request_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_time ON ai_usage (tenant_id, organization_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_group_time ON ai_usage (tenant_id, organization_id, group_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider_time ON ai_usage (tenant_id, organization_id, provider_code, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model_time ON ai_usage (tenant_id, organization_id, model_code, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_api_key_time ON ai_usage (tenant_id, organization_id, api_key_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time ON ai_usage (tenant_id, organization_id, user_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_settlement_status ON ai_usage (tenant_id, organization_id, settlement_status, created_at, id);
