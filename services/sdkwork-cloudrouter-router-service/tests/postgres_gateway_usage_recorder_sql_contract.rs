const POSTGRES_GATEWAY_USAGE_RECORDER: &str =
    include_str!("../src/infrastructure/sql/postgres/gateway_usage_recorder.rs");
const PRICING_BASELINE: &str = include_str!(
    "../../../database/modules/pricing/ddl/baseline/postgres/0001_pricing_baseline.sql"
);
const CLOUDROUTER_BILLING_BASELINE: &str = include_str!(
    "../../../database/modules/cloudrouter-billing/ddl/baseline/postgres/0001_cloudrouter_billing_baseline.sql"
);

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
        "INSERT INTO ai_metering_request_trace",
        "ON CONFLICT (tenant_id, organization_id, request_id, attempt_no) DO UPDATE SET",
        "INSERT INTO ai_metering_usage",
        "ON CONFLICT (tenant_id, organization_id, request_id, usage_type) DO UPDATE SET",
        "INSERT INTO cloudrouter_usage_measurement",
        "ON CONFLICT (tenant_id, organization_id, invocation_id, measurement_key)",
        "INSERT INTO cloudrouter_rating_decision",
        "ON CONFLICT (tenant_id, organization_id, measurement_id)",
        "INSERT INTO cloudrouter_charge_line",
        "ON CONFLICT (tenant_id, organization_id, rating_decision_id)",
        "to_timestamp($29::double precision / 1000.0)",
        "to_timestamp($30::double precision / 1000.0)",
        "to_timestamp($46::double precision / 1000.0)",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
}

#[test]
fn gateway_trace_upsert_placeholder_order_matches_all_postgres_bindings() {
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
}

#[test]
fn gateway_usage_upsert_placeholder_order_matches_all_postgres_bindings() {
    let postgres_sql = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "const UPSERT_USAGE_FACT: &str = r#\"",
        "#[derive(Debug, Clone)]",
    );
    let postgres_bindings = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "async fn upsert_usage_fact(",
        "async fn upsert_billing_ledger(",
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
}

#[test]
fn billing_ledger_placeholder_order_matches_all_postgres_bindings() {
    for (start, end, placeholder_count) in [
        (
            "const UPSERT_USAGE_MEASUREMENT: &str = r#\"",
            "const UPSERT_RATING_DECISION",
            25,
        ),
        (
            "const UPSERT_RATING_DECISION: &str = r#\"",
            "const UPSERT_CHARGE_LINE",
            42,
        ),
        (
            "const UPSERT_CHARGE_LINE: &str = r#\"",
            "const LOAD_OFFICIAL_RATE_IDENTITY",
            22,
        ),
        (
            "const LOAD_OFFICIAL_RATE_IDENTITY: &str = r#\"",
            "const LOAD_PRICING_POLICY_IDENTITY",
            20,
        ),
        (
            "const LOAD_PRICING_POLICY_IDENTITY: &str = r#\"",
            "#[derive(Debug, sqlx::FromRow)]",
            11,
        ),
    ] {
        let sql = function_block(POSTGRES_GATEWAY_USAGE_RECORDER, start, end);
        assert_eq!(
            (1..=placeholder_count).collect::<std::collections::BTreeSet<_>>(),
            numbered_placeholders(sql, '$')
        );
    }

    let bindings = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "async fn upsert_billing_ledger(",
        "fn ledger_product_code(",
    );
    assert_eq!(120, bindings.matches(".bind(").count());
}

#[test]
fn billing_ledger_only_creates_charge_lines_for_positive_rated_amounts() {
    let source = POSTGRES_GATEWAY_USAGE_RECORDER;
    for expected in [
        "let rated = command.decision_status == \"rated\" && command.billability == \"chargeable\"",
        "let creates_charge_line = rated && charge_amount > DecimalValue::ZERO",
        "validate_resolved_identities",
        "let amount = rated.then_some(command.customer_charge_amount.as_str())",
        "rating_decision.decision_status != \"rated\"",
        "rating_decision.billability != \"chargeable\"",
        "price-service",
    ] {
        assert_sql_contains(source, expected);
    }
    assert!(!source.contains("expected_amount"));
    assert!(!source.contains("expected_rated_unit_price"));
}

#[test]
fn database_guards_allow_only_explicitly_rated_chargeable_amounts() {
    for expected in [
        "ck_pricing_rate_calculation_mode",
        "calculation_mode IN ('per_unit', 'flat', 'graduated', 'volume', 'formula')",
        "ck_pricing_rate_flat_unit_size",
        "calculation_mode <> 'flat' OR unit_size = 1",
        "ck_pricing_rate_chargeable_price",
        "billability <> 'chargeable' OR unit_price > 0",
    ] {
        assert_sql_contains(PRICING_BASELINE, expected);
    }
    for expected in [
        "ck_cloudrouter_rating_decision_status",
        "decision_status IN ('rated', 'non_chargeable', 'unrated')",
        "decision_status = 'rated' AND billability = 'chargeable'",
        "price_book_id IS NOT NULL AND rate_id IS NOT NULL",
        "pricing_plan_id IS NOT NULL AND pricing_rule_id IS NOT NULL",
        "quantity > 0 AND reference_amount >= 0 AND cost_amount >= 0 AND amount > 0",
    ] {
        assert_sql_contains(CLOUDROUTER_BILLING_BASELINE, expected);
    }
}

#[test]
fn billing_ledger_validates_the_exact_price_service_record_identities() {
    for expected in [
        "FROM pricing_price_book book JOIN pricing_rate rate",
        "book.tenant_id = $1",
        "book.organization_id = $2",
        "book.id = $3",
        "rate.id = $4",
        "book.lifecycle_state IN ('active', 'retired')",
        "rate.rate_hash = $6",
        "rate.catalog_key = $10",
        "rate.conditions = $19::jsonb",
        "rate.effective_from <= to_timestamp($20::double precision / 1000.0)",
        "FROM cloudrouter_account_rate_card rate_card JOIN cloudrouter_pricing_plan plan",
        "rate_card.tenant_id = $1",
        "rate_card.organization_id = $2",
        "rate_card.id = $3",
        "plan.id = $6",
        "rule.id = $10",
        "plan.plan_code = $7",
        ".map(|rate| rate.price_book_id)",
        ".map(|rate| rate.rate_id)",
        ".map(|plan| plan.pricing_plan_id)",
        ".map(|plan| plan.pricing_rule_id)",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
    let official = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "const LOAD_OFFICIAL_RATE_IDENTITY: &str = r#\"",
        "const LOAD_PRICING_POLICY_IDENTITY",
    );
    let policy = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "const LOAD_PRICING_POLICY_IDENTITY: &str = r#\"",
        "#[derive(Debug, sqlx::FromRow)]",
    );
    assert!(!official.contains("namespace_code = 'models'"));
    assert!(!official.contains("ORDER BY"));
    assert!(!official.contains("LIMIT 1"));
    assert!(!policy.contains("subject_type = 'account_group'"));
    assert!(!policy.contains("ORDER BY"));
    assert!(!policy.contains("LIMIT 1"));
}

#[test]
fn billing_ledger_preserves_cross_scope_price_and_plan_identities() {
    for expected in [
        "price_book_tenant_id",
        "price_book_organization_id",
        "pricing_plan_tenant_id",
        "pricing_plan_organization_id",
        "account_rate_card_tenant_id",
        "account_rate_card_organization_id",
        "account_rate_card_id",
        "fk_cloudrouter_rating_decision_book",
        "FOREIGN KEY (price_book_tenant_id, price_book_organization_id, price_book_id)",
        "fk_cloudrouter_rating_decision_plan",
        "fk_cloudrouter_rating_decision_rate_card",
        "FOREIGN KEY (pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id)",
    ] {
        assert_sql_contains(CLOUDROUTER_BILLING_BASELINE, expected);
    }
}

#[test]
fn billing_ledger_rejects_idempotency_payload_drift() {
    for expected in [
        "usage measurement payload changed during replay",
        "rating decision payload changed during replay",
        "charge line payload changed during replay",
        "cloudrouter_usage_measurement.quantity = excluded.quantity",
        "cloudrouter_rating_decision.amount IS NOT DISTINCT FROM excluded.amount",
        "cloudrouter_rating_decision.rate_id IS NOT DISTINCT FROM excluded.rate_id",
        "cloudrouter_rating_decision.account_rate_card_id IS NOT DISTINCT FROM excluded.account_rate_card_id",
        "cloudrouter_rating_decision.pricing_plan_id IS NOT DISTINCT FROM excluded.pricing_plan_id",
        "cloudrouter_charge_line.amount = excluded.amount",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
}

#[test]
fn usage_measurement_records_vendor_and_provider_as_distinct_dimensions() {
    for expected in [
        "vendor_code, provider_code, region_code",
        "catalog_vendor_code(&command.catalog_key)",
        "bounded_code(&command.supplier_code, 64)",
    ] {
        assert_sql_contains(POSTGRES_GATEWAY_USAGE_RECORDER, expected);
    }
}

#[test]
fn gateway_trace_upsert_preserves_text_error_types_and_never_persists_raw_user_agent() {
    let source = POSTGRES_GATEWAY_USAGE_RECORDER;
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
        "upsert_billing_ledger(&mut transaction, &command, &context)",
        "if chargeable {",
        "transaction.commit()",
        "settlement_status, idempotency_key",
        ".bind(usage_idempotency_key(command))",
    ] {
        assert!(
            POSTGRES_GATEWAY_USAGE_RECORDER.contains(expected),
            "Postgres gateway usage transaction must include `{expected}`"
        );
    }

    let single_record = function_block(
        POSTGRES_GATEWAY_USAGE_RECORDER,
        "fn record_gateway_usage_with_context<'a>(",
        "async fn upsert_trace(",
    );
    let rating_offset = single_record
        .find("upsert_billing_ledger")
        .expect("rating must be called");
    let legacy_usage_offset = single_record
        .find("upsert_usage_fact")
        .expect("legacy usage must be called");
    assert!(rating_offset < legacy_usage_offset);
    assert_sql_contains(
        single_record,
        "let chargeable = upsert_billing_ledger(&mut transaction, &command, &context).await?; if chargeable { upsert_usage_fact",
    );
}

#[test]
fn gateway_usage_recorder_preserves_non_pending_usage_facts_on_duplicate_request_id() {
    for expected in [
        "WHERE NOT EXISTS ( SELECT 1 FROM ai_metering_usage settled_usage",
        "settled_usage.tenant_id = ai_metering_request_trace.tenant_id",
        "settled_usage.organization_id = ai_metering_request_trace.organization_id",
        "settled_usage.request_id = ai_metering_request_trace.request_id",
        "settled_usage.settlement_status IS DISTINCT FROM 0",
        "WHERE ai_metering_usage.settlement_status = 0",
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
        !sql.contains("COALESCE(ai_metering_usage.settlement_status, 0)"),
        "Postgres usage fact upsert must not treat NULL settlement_status as pending"
    );
}

#[test]
fn gateway_usage_recorder_scopes_rows_and_projects_meter_amounts() {
    for expected in [
        "tenant_id, organization_id, user_id, request_id, trace_id",
        "api_key_id, api_key_name_snapshot, account_group_id, account_group_snapshot",
        "requested_model, requested_model_catalog_key, provider_model, provider_native_model",
        "region_code, endpoint, request_path",
        "catalog_key, requested_model_catalog_key, model, provider_native_model",
        "region_code, account_id, modality",
        "billable_quantity, prompt_tokens, cached_tokens, completion_tokens, total_tokens",
        "request_count, result_count, item_count, character_count, image_count",
        "audio_seconds, video_seconds",
        "base_input_unit_price, base_output_unit_price, cache_read_unit_price",
        "rate_multiplier, reference_multiplier, official_reference_amount",
        "upstream_cost_amount, customer_charge_amount",
        "pricing_snapshot",
        "pricing_plan_code",
        "unit_size",
        "reference_amount, cost_amount, amount",
        ".bind(&command.requested_model_catalog_key)",
        ".bind(&command.provider_native_model)",
        ".bind(&command.region_code)",
        ".bind(&command.rate_multiplier)",
        ".bind(&command.reference_multiplier)",
        ".bind(&command.official_reference_amount)",
        ".bind(&command.upstream_cost_amount)",
        ".bind(&command.customer_charge_amount)",
        ".bind(&command.pricing_snapshot)",
        ".bind(&command.unit_size)",
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
