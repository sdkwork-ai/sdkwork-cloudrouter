use sqlx::AssertSqlSafe;

const BILLABLE_USAGE_SELECT: &str = r#"
SELECT
    c.tenant_id,
    c.organization_id,
    COALESCE(c.user_id, m.user_id, trace_snapshot.user_id) AS user_id,
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
    c.currency_code AS currency,
    c.debit_points AS debit_points,
    c.original_currency_amount AS original_currency_amount,
    c.original_currency_code AS original_currency_code,
    COALESCE(
        NULLIF(d.pricing_snapshot #>> '{pricing,saleMultiplier}', '')::numeric,
        NULLIF(d.pricing_snapshot #>> '{multipliers,sale}', '')::numeric,
        1
    ) AS rate_multiplier,
    -- Persisted `base_*_unit_price` follows the legacy ai_metering_usage
    -- semantics: the customer unit price BEFORE the sale multiplier is placed
    -- in the input/output/cache-read column by billing-meter role so the
    -- admin and console usage pages reconstruct per-record pricing the same
    -- way for every meter (chat, embedding, image, audio, video, api_request,
    -- reasoning, cache, result, ...). Only output-role meters map to the
    -- output column and cache-read maps to the cache column; every other
    -- meter (input, request, cache-write, result, adapter) maps to the input
    -- column exactly as `settlement::unit_price_columns` writes the legacy
    -- columns, so both ledger tracks display identically.
    CASE WHEN m.meter_code IN (
             'llm_input_token', 'llm_reasoning_token', 'llm_cache_write_token',
             'llm_cache_storage_token_hour', 'embedding_input_token', 'embedding_image',
             'image_input_token', 'image_pixel', 'image_megapixel', 'image_result',
             'audio_input_token', 'audio_input_second', 'audio_input_minute',
             'audio_output_second', 'audio_output_minute',
             'tts_input_character', 'speech_character', 'stt_audio_minute',
             'video_input_token', 'video_input_second', 'video_output_second', 'video_result',
             'music_output_second', 'sfx_result', 'rerank_search', 'rerank_document',
             'api_request', 'api_result', 'api_item',
             'tool_call', 'web_search_call', 'file_search_call',
             'code_interpreter_session', 'container_session',
             'storage_gb_day', 'bandwidth_gb'
         ) THEN COALESCE(d.unit_price, 0) ELSE 0 END AS base_input_unit_price,
    CASE WHEN m.meter_code IN (
             'llm_output_token',
             'image_output_token', 'audio_output_token', 'video_output_token'
         ) THEN COALESCE(d.unit_price, 0) ELSE 0 END AS base_output_unit_price,
    CASE WHEN m.meter_code = 'llm_cache_read_token' THEN COALESCE(d.unit_price, 0) ELSE 0 END AS cache_read_unit_price,
    COALESCE(NULLIF(d.unit_size, 0), 1000000) AS unit_size,
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
        trace.user_id,
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
    legacy.user_id,
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
    legacy.currency,
    legacy.debit_points,
    legacy.original_currency_amount,
    legacy.original_currency_code,
    COALESCE(legacy.rate_multiplier, 1),
    COALESCE(legacy.base_input_unit_price, 0),
    COALESCE(legacy.base_output_unit_price, 0),
    COALESCE(legacy.cache_read_unit_price, 0),
    COALESCE(
        NULLIF(legacy.pricing_snapshot #>> '{pricing,unitSize}', '')::numeric,
        NULLIF(legacy.pricing_snapshot #>> '{unitPrice,unitSize}', '')::numeric,
        1000000
    ),
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

#[cfg(test)]
mod tests {
    use super::BILLABLE_USAGE_SELECT;

    #[test]
    fn billable_usage_projects_user_id_for_subject_scoped_reads() {
        assert!(
            BILLABLE_USAGE_SELECT.contains(
                "COALESCE(c.user_id, m.user_id, trace_snapshot.user_id) AS user_id"
            ),
            "charge-line billable_usage rows must expose user_id for per-user usage reads"
        );
        assert!(
            BILLABLE_USAGE_SELECT.contains("legacy.user_id"),
            "legacy billable_usage rows must expose user_id for per-user usage reads"
        );
        assert!(
            BILLABLE_USAGE_SELECT.contains("trace.user_id,"),
            "trace snapshot must carry user_id as a fallback subject identity"
        );
    }

    #[test]
    fn billable_usage_maps_every_meter_role_to_a_base_price_column() {
        // Input/request/result/adapter meters must project their unit price
        // into base_input_unit_price so non-chat chargeable usage (embeddings,
        // image, audio, video, api_request, reasoning, cache-write) displays
        // its persisted unit price instead of 0 on admin and console pages.
        for meter in [
            "llm_input_token",
            "llm_reasoning_token",
            "llm_cache_write_token",
            "embedding_input_token",
            "embedding_image",
            "image_input_token",
            "image_result",
            "audio_input_token",
            "audio_input_second",
            "tts_input_character",
            "speech_character",
            "stt_audio_minute",
            "video_input_token",
            "video_input_second",
            "video_result",
            "sfx_result",
            "api_request",
            "api_result",
            "tool_call",
            "web_search_call",
            "file_search_call",
            "container_session",
            "storage_gb_day",
        ] {
            let quoted = format!("'{meter}'");
            assert!(
                BILLABLE_USAGE_SELECT
                    .split("AS base_input_unit_price")
                    .next()
                    .expect("input price column")
                    .contains(&quoted),
                "billable_usage must project meter {meter} into base_input_unit_price"
            );
        }
        for meter in ["llm_output_token", "image_output_token", "audio_output_token", "video_output_token"] {
            let quoted = format!("'{meter}'");
            assert!(
                BILLABLE_USAGE_SELECT
                    .split("AS base_output_unit_price")
                    .next()
                    .expect("output price column")
                    .contains(&quoted),
                "billable_usage must project meter {meter} into base_output_unit_price"
            );
        }
        assert!(
            BILLABLE_USAGE_SELECT
                .split("AS cache_read_unit_price")
                .next()
                .expect("cache read price column")
                .contains("'llm_cache_read_token'"),
            "billable_usage must project llm_cache_read_token into cache_read_unit_price"
        );
    }

    #[test]
    fn billable_usage_falls_back_unit_size_from_zero_to_default() {
        assert!(
            BILLABLE_USAGE_SELECT.contains("COALESCE(NULLIF(d.unit_size, 0), 1000000) AS unit_size"),
            "new-track billable_usage must treat a stored zero unit_size as the 1M default"
        );
        for expected in [
            "NULLIF(legacy.pricing_snapshot #>> '{pricing,unitSize}', '')::numeric",
            "NULLIF(legacy.pricing_snapshot #>> '{unitPrice,unitSize}', '')::numeric",
        ] {
            assert!(
                BILLABLE_USAGE_SELECT.contains(expected),
                "legacy billable_usage must read unit_size from the persisted pricing snapshot ({expected})"
            );
        }
    }
}
