BEGIN;

INSERT INTO ai_provider (
    id, uuid, tenant_id, organization_id, provider_code, display_name,
    default_vendor_code, provider_type, protocol_code, base_url, auth_type, sort_order
) VALUES (
    10, 'legacy-provider-openai', 1, 0, 'openai', 'OpenAI Official',
    'openai', 'official', 'openai', 'https://api.openai.example/v1', 1, 10
);

INSERT INTO ai_site (
    id, uuid, tenant_id, organization_id, site_code, site_name, display_name,
    base_url, site_type, owner_kind, region_code, environment, health_status, sort_order
) VALUES (
    20, 'legacy-site-relay-cn', 1, 0, 'relay-cn', 'Relay CN', 'Relay CN',
    'https://relay.example/v1', 'relay', 'third_party', 'cn-east', 1, 1, 20
);

INSERT INTO ai_site_service (
    id, uuid, tenant_id, organization_id, site_id, site_code, service_code,
    service_name, protocol_code, base_url, auth_type, credential_ref,
    credential_hash, masked_label, credential_version, region_code, sort_order
) VALUES (
    21, 'legacy-site-service-relay', 1, 0, 20, 'relay-cn', 'openai-compatible',
    'OpenAI Compatible', 'openai', 'https://relay.example/v1', 1,
    'vault://test/relay/service', 'sha256:test-relay-service', 'sk-relay...test', 2,
    'cn-east', 10
);

INSERT INTO ai_channel (
    id, uuid, tenant_id, organization_id, provider_id, provider_code,
    channel_code, channel_name, channel_type, protocol_code, auth_type,
    base_url, environment, region_code, priority, weight, timeout_ms, health_status
) VALUES (
    100, 'legacy-channel-official', 1, 0, 10, 'openai',
    'openai-primary', 'OpenAI Primary', 'official', 'openai', 1,
    'https://api.openai.example/v1', 1, 'global', 10, 80, 60000, 1
);

INSERT INTO ai_channel (
    id, uuid, tenant_id, organization_id, site_id, site_service_id, site_code,
    site_service_code, channel_code, channel_name, channel_type, protocol_code,
    auth_type, environment, region_code, priority, weight, timeout_ms, health_status
) VALUES (
    101, 'legacy-channel-relay', 1, 0, 20, 21, 'relay-cn',
    'openai-compatible', 'relay-primary', 'Relay Primary', 'relay', 'openai',
    1, 1, 'cn-east', 20, 100, 45000, 1
);

INSERT INTO ai_channel (
    id, uuid, tenant_id, organization_id, provider_id, provider_code,
    channel_code, channel_name, channel_type, protocol_code, auth_type,
    credential_ref, credential_hash, credential_version, masked_label,
    environment, region_code, priority, weight, timeout_ms, health_status
) VALUES (
    102, 'legacy-channel-inline', 1, 0, 10, 'openai',
    'openai-secondary', 'OpenAI Secondary', 'official', 'openai', 1,
    'vault://test/openai/inline', 'sha256:test-openai-inline', 3, 'sk-openai...test',
    1, 'global', 30, 60, 60000, 1
);

INSERT INTO ai_channel_credential (
    id, uuid, tenant_id, organization_id, channel_id, provider_code,
    channel_code, credential_name, base_url, credential_ref, credential_hash,
    masked_label, priority, weight
) VALUES (
    1000, 'legacy-channel-credential', 1, 0, 100, 'openai',
    'openai-primary', 'Primary API key', 'https://api.openai.example/v1',
    'vault://test/openai/primary', 'sha256:test-openai-primary', 'sk-openai...test', 10, 100
);

INSERT INTO ai_channel_group (
    id, uuid, tenant_id, organization_id, group_code, group_name, group_type,
    rate_multiplier, official_price_multiplier, capacity_limit
) VALUES (
    200, 'legacy-channel-group-default', 1, 0, 'default', 'Default route group',
    'shared', 1.15, 1.25, 1000000
);

INSERT INTO ai_channel_group_member (
    id, uuid, tenant_id, organization_id, channel_group_id, channel_id,
    priority, weight, enabled
) VALUES
    (210, 'legacy-group-member-100', 1, 0, 200, 100, 10, 80, TRUE),
    (211, 'legacy-group-member-101', 1, 0, 200, 101, 20, 100, TRUE),
    (212, 'legacy-group-member-102', 1, 0, 200, 102, 30, 60, TRUE);

INSERT INTO ai_channel_group_metric_snapshot (
    id, uuid, tenant_id, organization_id, source_version, channel_group_id,
    group_code, provider_code, channel_available_count, channel_total_count,
    capacity_used, capacity_limit, request_count_today, request_count_total,
    usage_amount_today, usage_amount_total, health_status, snapshot_at
) VALUES (
    220, 'legacy-group-metric', 1, 0, 1, 200,
    'default', 'openai', 3, 3, 125, 1000, 8, 88, 12.5, 125.0, 1, CURRENT_TIMESTAMP
);

INSERT INTO ai_channel_group_resource (
    id, uuid, tenant_id, organization_id, channel_group_id,
    resource_code, resource_group_code, grant_type, priority
) VALUES (230, 'legacy-group-resource', 1, 0, 200, 'gpt-4o', '', 'allow', 10);

INSERT INTO ai_channel_resource (
    id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
    resource_code, resource_group_code, grant_type, priority, weight
) VALUES
    (240, 'legacy-channel-resource-openai', 1, 0, 100, 'openai', 'openai-primary',
     'gpt-4o', '', 'allow', 10, 100),
    (241, 'legacy-channel-resource-relay', 1, 0, 101, 'relay-cn', 'relay-primary',
     'gpt-4o', '', 'allow', 20, 100);

INSERT INTO ai_pricing_plan (
    id, uuid, tenant_id, organization_id, plan_code, plan_name,
    base_price_side, currency, effective_from
) VALUES (300, 'legacy-pricing-plan', 1, 0, 'default', 'Default pricing', 1, 'USD', CURRENT_TIMESTAMP);

INSERT INTO ai_pricing_rule (
    id, uuid, tenant_id, organization_id, pricing_plan_id, pricing_plan_code,
    rule_code, rule_name, provider_code, channel_id, billing_meter_code,
    formula_mode, priority, effective_from
) VALUES (
    301, 'legacy-pricing-rule', 1, 0, 300, 'default',
    'gpt-4o-input', 'GPT-4o input', 'openai', 100, 'token.input', 1, 10, CURRENT_TIMESTAMP
);

INSERT INTO ai_provider_object_route (
    id, uuid, tenant_id, organization_id, channel_group_id,
    object_type, object_id, object_key_hash, provider_code, channel_id,
    vendor_code, api_code, catalog_key, provider_model
) VALUES (
    310, 'legacy-object-route', 1, 0, 200,
    'conversation', 'conv-1', 'sha256:test-conv-1', 'openai', 100,
    'openai', 'chat.completions', 'gpt-4o', 'gpt-4o'
);

INSERT INTO ai_routing_decision_log (
    id, uuid, tenant_id, organization_id, request_id, trace_id,
    selected_provider_id, selected_channel_id, decision_latency_ms
) VALUES (320, 'legacy-routing-decision', 1, 0, 'req-1', 'trace-1', 10, 100, 2);

INSERT INTO ai_usage (
    id, uuid, tenant_id, organization_id, request_id, trace_id,
    idempotency_key, decision_log_id, channel_group_id, channel_group_snapshot,
    catalog_key, requested_model_catalog_key, model, provider_native_model,
    provider_id, channel_id, usage_type, billing_meter_code, billable_quantity,
    prompt_tokens, completion_tokens, total_tokens, currency, occurred_at,
    settlement_status
) VALUES (
    330, 'legacy-usage', 1, 0, 'req-1', 'trace-1',
    'usage-req-1', 320, 200, 'Default route group',
    'gpt-4o', 'gpt-4o', 'gpt-4o', 'gpt-4o',
    10, 100, 1, 'token.total', 15, 10, 5, 15, 'USD', CURRENT_TIMESTAMP, 1
);

INSERT INTO ai_request_trace (
    id, uuid, tenant_id, organization_id, request_id, trace_id,
    attempt_no, decision_log_id, channel_group_id, channel_group_snapshot,
    provider_id, channel_id, channel_name_snapshot, requested_model,
    provider_model, started_at, ended_at, latency_ms, http_status
) VALUES (
    340, 'legacy-request-trace', 1, 0, 'req-1', 'trace-1',
    1, 320, 200, 'Default route group', 10, 100, 'OpenAI Primary', 'gpt-4o',
    'gpt-4o', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 25, 200
);

INSERT INTO iam_gateway_api_key (
    id, uuid, tenant_id, organization_id, user_id, channel_group_id,
    name, key_prefix, key_display_masked, key_hash, hash_alg,
    secret_version, idempotency_key
) VALUES (
    500, 'legacy-api-key', 1, 0, 900, 200,
    'Production gateway', 'sk-gw', 'sk-gw...test', 'sha256:test-gateway', 'sha256',
    1, 'gateway-key-500'
);

INSERT INTO iam_gateway_api_key_channel_group (
    id, uuid, tenant_id, organization_id, user_id, api_key_id,
    channel_group_id, channel_group_code, binding_role, routing_strategy,
    priority, weight
) VALUES (
    501, 'legacy-api-key-group', 1, 0, 900, 500,
    200, 'default', 'route', 'auto', 10, 100
);

COMMIT;
