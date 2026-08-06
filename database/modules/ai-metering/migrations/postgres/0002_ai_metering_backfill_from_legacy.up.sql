-- sdkwork:migration
-- id: 0002_ai_metering_backfill_from_legacy
-- engine: postgres
-- module: ai-metering
-- purpose: Backfill ai_metering_usage/ai_metering_request_trace from the
--          legacy cloudrouter core ai_usage/ai_request_trace tables
--          (idempotent; safe to re-run). Legacy tables remain in the root
--          baseline as legacy-compat until the DB066/DB068 cleanup plan.

INSERT INTO ai_metering_usage
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id,
     payload_hash, idempotency_key, status, created_at, retention_until,
     legal_hold, metadata, decision_log_id, api_key_id, api_key_name_snapshot,
     account_group_id, account_group_snapshot, owner_type, owner_id,
     owner_name_snapshot, catalog_key, requested_model_catalog_key, model,
     provider_native_model, region_code, supplier_id, account_id, modality,
     usage_type, billing_type, billing_mode, billing_meter_id, billing_meter_code,
     billing_tier, billable_quantity, billable_unit, prompt_tokens,
     completion_tokens, cached_tokens, total_tokens, request_count, result_count,
     item_count, character_count, image_count, audio_seconds, video_seconds,
     storage_byte_hours, bandwidth_bytes, base_input_unit_price,
     base_output_unit_price, cache_read_unit_price, rate_multiplier,
     reference_multiplier, official_reference_amount, upstream_cost_amount,
     customer_charge_amount, currency, pricing_id, pricing_plan_id,
     pricing_plan_code, pricing_rule_id, pricing_tier_id, pricing_snapshot,
     reasoning_effort, occurred_at, settlement_status, settlement_id)
SELECT
    id, uuid, tenant_id, organization_id, user_id, request_id, trace_id,
    payload_hash, idempotency_key, status, created_at, retention_until,
    legal_hold, metadata, decision_log_id, api_key_id, api_key_name_snapshot,
    account_group_id, account_group_snapshot, owner_type, owner_id,
    owner_name_snapshot, catalog_key, requested_model_catalog_key, model,
    provider_native_model, region_code, supplier_id, account_id, modality,
    usage_type, billing_type, billing_mode, billing_meter_id, billing_meter_code,
    billing_tier, billable_quantity, billable_unit, prompt_tokens,
    completion_tokens, cached_tokens, total_tokens, request_count, result_count,
    item_count, character_count, image_count, audio_seconds, video_seconds,
    storage_byte_hours, bandwidth_bytes, base_input_unit_price,
    base_output_unit_price, cache_read_unit_price, rate_multiplier,
    reference_multiplier, official_reference_amount, upstream_cost_amount,
    customer_charge_amount, currency, pricing_id, pricing_plan_id,
    pricing_plan_code, pricing_rule_id, pricing_tier_id, pricing_snapshot,
    reasoning_effort, occurred_at, settlement_status, settlement_id
FROM ai_usage
WHERE to_regclass('ai_usage') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM ai_metering_usage m
      WHERE m.tenant_id = ai_usage.tenant_id
        AND m.organization_id = ai_usage.organization_id
        AND m.id = ai_usage.id
  );

INSERT INTO ai_metering_request_trace
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id,
     payload_hash, status, created_at, retention_until, legal_hold, metadata,
     attempt_no, decision_log_id, api_key_id, api_key_name_snapshot,
     account_group_id, account_group_snapshot, owner_type, owner_id,
     owner_name_snapshot, supplier_id, account_id, account_name_snapshot,
     requested_model, requested_model_catalog_key, provider_model,
     provider_native_model, gateway_instance_id, gateway_instance_code_snapshot,
     gateway_region_code_snapshot, gateway_node_name_snapshot, region_code,
     endpoint, request_path, http_method, http_status, provider_error_code,
     error_type, started_at, ended_at, latency_ms, ttft_ms, streaming,
     request_bytes, response_bytes, prompt_tokens, completion_tokens,
     cached_tokens, total_tokens, request_payload_hash, response_payload_hash,
     error_message_masked, reasoning_effort, client_ip_hash, client_ip_masked,
     client_ip_region, user_agent_hash)
SELECT
    id, uuid, tenant_id, organization_id, user_id, request_id, trace_id,
    payload_hash, status, created_at, retention_until, legal_hold, metadata,
    attempt_no, decision_log_id, api_key_id, api_key_name_snapshot,
    account_group_id, account_group_snapshot, owner_type, owner_id,
    owner_name_snapshot, supplier_id, account_id, account_name_snapshot,
    requested_model, requested_model_catalog_key, provider_model,
    provider_native_model, gateway_instance_id, gateway_instance_code_snapshot,
    gateway_region_code_snapshot, gateway_node_name_snapshot, region_code,
    endpoint, request_path, http_method, http_status, provider_error_code,
    error_type, started_at, ended_at, latency_ms, ttft_ms, streaming,
    request_bytes, response_bytes, prompt_tokens, completion_tokens,
    cached_tokens, total_tokens, request_payload_hash, response_payload_hash,
    error_message_masked, reasoning_effort, client_ip_hash, client_ip_masked,
    client_ip_region, user_agent_hash
FROM ai_request_trace
WHERE to_regclass('ai_request_trace') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM ai_metering_request_trace t
      WHERE t.tenant_id = ai_request_trace.tenant_id
        AND t.organization_id = ai_request_trace.organization_id
        AND t.request_id = ai_request_trace.request_id
        AND t.attempt_no = ai_request_trace.attempt_no
  );
