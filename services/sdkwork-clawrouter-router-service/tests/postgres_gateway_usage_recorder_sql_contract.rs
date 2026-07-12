const POSTGRES_GATEWAY_USAGE_RECORDER: &str =
    include_str!("../src/infrastructure/sql/postgres/gateway_usage_recorder.rs");
const SQLITE_GATEWAY_USAGE_RECORDER: &str =
    include_str!("../src/infrastructure/sql/sqlite/gateway_usage_recorder.rs");

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

fn function_block<'a>(source: &'a str, start: &str, end: &str) -> &'a str {
    source
        .split_once(start)
        .unwrap_or_else(|| panic!("missing function marker: {start}"))
        .1
        .split_once(end)
        .unwrap_or_else(|| panic!("missing function marker: {end}"))
        .0
}

fn numbered_placeholders(source: &str, marker: char) -> std::collections::BTreeSet<usize> {
    let mut placeholders = std::collections::BTreeSet::new();
    let bytes = source.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] as char != marker {
            index += 1;
            continue;
        }
        let start = index + 1;
        let mut end = start;
        while end < bytes.len() && bytes[end].is_ascii_digit() {
            end += 1;
        }
        if end > start {
            placeholders.insert(source[start..end].parse::<usize>().unwrap());
        }
        index = end.max(index + 1);
    }
    placeholders
}

#[test]
fn gateway_usage_recorder_upserts_trace_and_usage_fact_by_business_unique_keys() {
    for expected in [
        "INSERT INTO ai_request_trace",
        "ON CONFLICT (tenant_id, organization_id, request_id, attempt_no) DO UPDATE SET",
        "INSERT INTO ai_usage",
        "ON CONFLICT (tenant_id, organization_id, request_id, usage_type) DO UPDATE SET",
        "to_timestamp($29::double precision / 1000.0)",
        "to_timestamp($30::double precision / 1000.0)",
        "to_timestamp($46::double precision / 1000.0)",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
}

#[test]
fn gateway_trace_upsert_placeholder_order_matches_all_bindings_in_both_dialects() {
    let postgres_sql = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "const UPSERT_TRACE: &str = r#\"",
        "const UPSERT_USAGE_FACT",
    );
    let postgres_bindings = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "async fn upsert_trace(",
        "async fn upsert_usage_fact(",
    );
    assert_eq!(
        (1..=42).collect::<std::collections::BTreeSet<_>>(),
        numbered_placeholders(postgres_sql, '$')
    );
    assert_eq!(42, postgres_bindings.matches(".bind(").count());
    assert_sql_contains(
        postgres_sql,
        "$28, to_timestamp($29::double precision / 1000.0), to_timestamp($30::double precision / 1000.0), $31",
    );

    let sqlite_upsert = function_block(
        SQLITE_GATEWAY_USAGE_RECORDER,
        "async fn upsert_trace(",
        "async fn upsert_usage_fact(",
    );
    assert_eq!(
        (1..=42).collect::<std::collections::BTreeSet<_>>(),
        numbered_placeholders(sqlite_upsert, '?')
    );
    assert_eq!(42, sqlite_upsert.matches(".bind(").count());
    assert_sql_contains(
        sqlite_upsert,
        "?28, strftime('%Y-%m-%dT%H:%M:%fZ', ?29 / 1000.0, 'unixepoch'), strftime('%Y-%m-%dT%H:%M:%fZ', ?30 / 1000.0, 'unixepoch'), ?31",
    );
}

#[test]
fn gateway_usage_upsert_placeholder_order_matches_all_bindings_in_both_dialects() {
    let postgres_sql = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "const UPSERT_USAGE_FACT: &str = r#\"",
        "#[derive(Debug, Clone)]",
    );
    let postgres_bindings = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "async fn upsert_usage_fact(",
        "fn trace_uuid(",
    );
    assert_eq!(
        (1..=48).collect::<std::collections::BTreeSet<_>>(),
        numbered_placeholders(postgres_sql, '$')
    );
    assert_eq!(48, postgres_bindings.matches(".bind(").count());
    assert_sql_contains(
        postgres_sql,
        "$43, $44, $45::jsonb, to_timestamp($46::double precision / 1000.0), $47, $48",
    );

    let sqlite_upsert = function_block(
        SQLITE_GATEWAY_USAGE_RECORDER,
        "async fn upsert_usage_fact(",
        "fn trace_uuid(",
    );
    let sqlite_sql = sqlite_upsert
        .split_once("r#\"")
        .expect("missing SQLite usage SQL start")
        .1
        .split_once("\"#,")
        .expect("missing SQLite usage SQL end")
        .0;
    assert_eq!(48, sqlite_sql.matches('?').count());
    assert_eq!(48, sqlite_upsert.matches(".bind(").count());
    assert_sql_contains(
        sqlite_sql,
        "?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', ? / 1000.0, 'unixepoch'), ?, ?",
    );
}

#[test]
fn gateway_trace_upsert_preserves_text_error_types_and_never_persists_raw_user_agent() {
    for source in [
        POSTGRES_GATEWAY_USAGE_RECORDER,
        SQLITE_GATEWAY_USAGE_RECORDER,
    ] {
        let upsert = function_block(
            source,
            "async fn upsert_trace(",
            "async fn upsert_usage_fact(",
        );
        assert!(upsert.contains(".bind(command.error_type.as_deref())"));
        assert!(upsert.contains(".bind(context.user_agent_hash.as_deref())"));
        assert!(!source.contains("error_type_code"));
        assert!(!source.contains("json!({ \"userAgent\""));
    }
}

#[test]
fn gateway_usage_recorder_uses_versioned_stable_usage_identity() {
    for expected in [
        "usage-uuid:v1",
        "usage-idempotency:v1",
        "usage:v1:",
        "Some(command.usage_type)",
        "update_identity_component(&mut hasher, value)",
    ] {
        assert!(
            POSTGRES_GATEWAY_USAGE_RECORDER.contains(expected),
            "Postgres usage identity must include `{expected}`"
        );
    }
    assert!(
        !POSTGRES_GATEWAY_USAGE_RECORDER.contains("DefaultHasher"),
        "persistent usage identities must not depend on Rust's unspecified DefaultHasher"
    );
}

#[test]
fn gateway_usage_recorder_writes_trace_and_usage_in_one_transaction() {
    for expected in [
        "self.pool.begin()",
        "upsert_trace(&mut transaction, &trace_command, &context)",
        "upsert_usage_fact(&mut transaction, &command, &context)",
        "transaction.commit()",
        "settlement_status, idempotency_key",
        ".bind(usage_idempotency_key(command))",
    ] {
        assert!(
            POSTGRES_GATEWAY_USAGE_RECORDER.contains(expected),
            "Postgres gateway usage transaction must include `{expected}`"
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
        "upstream_cost_amount, customer_charge_amount",
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
