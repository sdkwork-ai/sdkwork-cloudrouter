use sqlx::AssertSqlSafe;

const BILLABLE_USAGE_SELECT: &str = r#"
SELECT
    c.tenant_id,
    c.organization_id,
    COALESCE(NULLIF(c.request_id, ''), c.invocation_id) AS request_id,
    trace_snapshot.owner_name_snapshot,
    trace_snapshot.api_key_name_snapshot,
    trace_snapshot.account_group_snapshot AS upstream_account_group_snapshot,
    m.catalog_key,
    COALESCE(NULLIF(trace_snapshot.requested_model_catalog_key, ''), m.catalog_key) AS requested_model_catalog_key,
    COALESCE(
        NULLIF(d.pricing_snapshot #>> '{resource,requestedModel}', ''),
        NULLIF(d.pricing_snapshot #>> '{model,model}', ''),
        NULLIF(trace_snapshot.requested_model, ''),
        NULLIF(m.catalog_key, '')
    ) AS model,
    COALESCE(
        NULLIF(d.pricing_snapshot #>> '{resource,providerNativeModel}', ''),
        NULLIF(d.pricing_snapshot #>> '{model,providerNativeModel}', ''),
        NULLIF(trace_snapshot.provider_native_model, ''),
        NULLIF(trace_snapshot.provider_model, '')
    ) AS provider_native_model,
    COALESCE(NULLIF(m.region_code, ''), NULLIF(trace_snapshot.region_code, '')) AS region_code,
    COALESCE((m.dimensions_json ->> 'modality')::integer, 0) AS modality,
    COALESCE((m.dimensions_json ->> 'promptTokens')::bigint, 0) AS prompt_tokens,
    COALESCE((m.dimensions_json ->> 'cachedTokens')::bigint, 0) AS cached_tokens,
    COALESCE((m.dimensions_json ->> 'completionTokens')::bigint, 0) AS completion_tokens,
    c.amount AS customer_charge_amount,
    COALESCE(
        NULLIF(d.pricing_snapshot #>> '{pricing,saleMultiplier}', '')::numeric,
        NULLIF(d.pricing_snapshot #>> '{multipliers,sale}', '')::numeric,
        1
    ) AS rate_multiplier,
    CASE WHEN m.meter_code = 'llm_input_token' THEN COALESCE(d.unit_price, 0) ELSE 0 END AS base_input_unit_price,
    CASE WHEN m.meter_code = 'llm_output_token' THEN COALESCE(d.unit_price, 0) ELSE 0 END AS base_output_unit_price,
    CASE WHEN m.meter_code = 'llm_cache_read_token' THEN COALESCE(d.unit_price, 0) ELSE 0 END AS cache_read_unit_price,
    c.charged_at AS occurred_at
FROM cloudrouter_charge_line c
JOIN cloudrouter_rating_decision d
  ON d.tenant_id = c.tenant_id
 AND d.organization_id = c.organization_id
 AND d.id = c.rating_decision_id
JOIN cloudrouter_usage_measurement m
  ON m.tenant_id = d.tenant_id
 AND m.organization_id = d.organization_id
 AND m.id = d.measurement_id
LEFT JOIN LATERAL (
    SELECT
        trace.owner_name_snapshot,
        trace.api_key_name_snapshot,
        trace.account_group_snapshot,
        trace.requested_model_catalog_key,
        trace.requested_model,
        trace.provider_native_model,
        trace.provider_model,
        trace.region_code
    FROM ai_metering_request_trace trace
    WHERE trace.status = 1
      AND trace.tenant_id = c.tenant_id
      AND trace.organization_id = c.organization_id
      AND trace.request_id = c.request_id
    ORDER BY trace.started_at DESC NULLS LAST, trace.id DESC
    LIMIT 1
) trace_snapshot ON TRUE
WHERE c.status = 1
  AND c.charge_status IN ('rated', 'settled')
  AND c.amount > 0
  AND d.status = 1
  AND d.decision_status = 'rated'
  AND d.billability = 'chargeable'
UNION ALL
SELECT
    legacy.tenant_id,
    legacy.organization_id,
    COALESCE(NULLIF(legacy.request_id, ''), CAST(legacy.id AS TEXT)),
    legacy.owner_name_snapshot,
    legacy.api_key_name_snapshot,
    legacy.account_group_snapshot,
    legacy.catalog_key,
    legacy.requested_model_catalog_key,
    legacy.model,
    legacy.provider_native_model,
    legacy.region_code,
    COALESCE(legacy.modality, 0),
    COALESCE(legacy.prompt_tokens, 0),
    COALESCE(legacy.cached_tokens, 0),
    COALESCE(legacy.completion_tokens, 0),
    legacy.customer_charge_amount,
    COALESCE(legacy.rate_multiplier, 1),
    COALESCE(legacy.base_input_unit_price, 0),
    COALESCE(legacy.base_output_unit_price, 0),
    COALESCE(legacy.cache_read_unit_price, 0),
    legacy.occurred_at
FROM ai_metering_usage legacy
WHERE legacy.status = 1
  AND COALESCE(legacy.customer_charge_amount, 0) > 0
  AND NOT EXISTS (
      SELECT 1
      FROM cloudrouter_rating_decision current_decision
      WHERE current_decision.tenant_id = legacy.tenant_id
        AND current_decision.organization_id = legacy.organization_id
        AND current_decision.invocation_id = legacy.request_id
        AND current_decision.status = 1
  )
"#;

pub(super) fn with_billable_usage(body: &str) -> AssertSqlSafe<String> {
    AssertSqlSafe(format!(
        "WITH billable_usage AS ({BILLABLE_USAGE_SELECT})\n{body}"
    ))
}
