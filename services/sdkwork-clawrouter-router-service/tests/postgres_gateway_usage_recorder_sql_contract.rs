const POSTGRES_GATEWAY_USAGE_RECORDER: &str =
    include_str!("../src/infrastructure/sql/postgres/gateway_usage_recorder.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres gateway usage recorder SQL must contain `{expected}`"
    );
}

#[test]
fn gateway_usage_recorder_upserts_trace_and_usage_fact_by_business_unique_keys() {
    for expected in [
        "INSERT INTO ai_request_trace",
        "ON CONFLICT (tenant_id, organization_id, request_id, attempt_no) DO UPDATE SET",
        "INSERT INTO ai_usage",
        "ON CONFLICT (tenant_id, organization_id, request_id, usage_type) DO UPDATE SET",
        "ended_at = CURRENT_TIMESTAMP",
        "occurred_at = CURRENT_TIMESTAMP",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
}

#[test]
fn gateway_usage_recorder_usage_uuid_is_scoped_by_usage_type() {
    for expected in [
        "command.request_id.hash(&mut hasher)",
        "command.usage_type.hash(&mut hasher)",
    ] {
        assert!(
            POSTGRES_GATEWAY_USAGE_RECORDER.contains(expected),
            "Postgres usage fact uuid must include `{expected}`"
        );
    }
}

#[test]
fn gateway_usage_recorder_preserves_non_pending_usage_facts_on_duplicate_request_id() {
    for expected in [
        "WHERE NOT EXISTS ( SELECT 1 FROM ai_usage settled_usage",
        "settled_usage.tenant_id = ai_request_trace.tenant_id",
        "settled_usage.organization_id = ai_request_trace.organization_id",
        "settled_usage.request_id = ai_request_trace.request_id",
        "settled_usage.settlement_status IS DISTINCT FROM 0",
        "WHERE ai_usage.settlement_status = 0",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
}

#[test]
fn gateway_usage_recorder_does_not_reopen_unknown_settlement_status() {
    let sql = compact_sql(POSTGRES_GATEWAY_USAGE_RECORDER);
    assert!(
        !sql.contains("COALESCE(settled_usage.settlement_status, 0)"),
        "Postgres gateway trace upsert must not treat NULL settlement_status as pending"
    );
    assert!(
        !sql.contains("COALESCE(ai_usage.settlement_status, 0)"),
        "Postgres usage fact upsert must not treat NULL settlement_status as pending"
    );
}

#[test]
fn gateway_usage_recorder_scopes_rows_and_projects_meter_amounts() {
    for expected in [
        "tenant_id, organization_id, user_id, request_id, trace_id",
        "api_key_id, api_key_name_snapshot, channel_group_id, channel_group_snapshot",
        "requested_model, requested_model_catalog_key, provider_model, provider_native_model",
        "region_code, endpoint, request_path",
        "catalog_key, requested_model_catalog_key, model, provider_native_model",
        "region_code, channel_id, modality",
        "billable_quantity, prompt_tokens, cached_tokens, completion_tokens, total_tokens",
        "request_count, result_count, item_count, character_count, image_count",
        "audio_seconds, video_seconds",
        "base_input_unit_price, base_output_unit_price, cache_read_unit_price",
        "rate_multiplier, reference_multiplier, official_reference_amount",
        "upstream_cost_amount, customer_charge_amount, cost_amount",
        "pricing_snapshot",
        "pricing_plan_code",
        ".bind(&command.requested_model_catalog_key)",
        ".bind(&command.provider_native_model)",
        ".bind(&command.region_code)",
        ".bind(&command.rate_multiplier)",
        ".bind(&command.reference_multiplier)",
        ".bind(&command.official_reference_amount)",
        ".bind(&command.pricing_snapshot)",
        ".bind(&command.billing_meter_code)",
        ".bind(&command.billable_quantity)",
        ".bind(command.request_count)",
        ".bind(command.result_count)",
        ".bind(command.video_seconds.as_deref())",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
}

#[test]
fn gateway_usage_recorder_does_not_persist_plaintext_provider_or_gateway_secrets() {
    for forbidden in [
        "authorization",
        "bearer",
        "api_key_secret",
        "provider_secret",
        "openai_bearer_token",
    ] {
        assert!(
            !POSTGRES_GATEWAY_USAGE_RECORDER
                .to_ascii_lowercase()
                .contains(forbidden),
            "Postgres gateway usage recorder must not persist plaintext secret field `{forbidden}`"
        );
    }
}
