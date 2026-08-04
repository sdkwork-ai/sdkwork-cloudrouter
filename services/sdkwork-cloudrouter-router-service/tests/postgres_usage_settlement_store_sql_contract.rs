const POSTGRES_USAGE_SETTLEMENT_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/usage_settlement_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres usage settlement SQL must contain `{expected}`"
    );
}

#[test]
fn usage_settlement_locks_pending_usage_and_points_account_in_one_transaction() {
    for expected in [
        "FROM ai_usage",
        "($1 <= 0 OR tenant_id = $1)",
        "($2 <= 0 OR organization_id = $2)",
        "settlement_status IN ($3, $4)",
        "ORDER BY COALESCE(occurred_at, CURRENT_TIMESTAMP), id",
        "FOR UPDATE SKIP LOCKED",
        "FROM commerce_account",
        "asset_type = $4",
        "currency_code = $5",
        "FOR UPDATE",
    ] {
        assert_sql_contains(POSTGRES_USAGE_SETTLEMENT_STORE, expected);
    }
}

#[test]
fn usage_settlement_bounds_pricing_snapshot_bytes_before_loading_json_text() {
    for expected in [
        "octet_length(CAST(COALESCE(pricing_snapshot, '{}'::jsonb) AS TEXT)) <= $6",
        "ELSE '{}' END AS pricing_snapshot",
        "AS pricing_snapshot_bytes",
        ".bind(MAX_PRICING_SNAPSHOT_BYTES)",
        "usage_fact.pricing_snapshot_bytes > i64::from(MAX_PRICING_SNAPSHOT_BYTES)",
        "INVALID_PRICING_SNAPSHOT",
        "usage pricing snapshot exceeds the settlement byte budget",
    ] {
        assert_sql_contains(POSTGRES_USAGE_SETTLEMENT_STORE, expected);
    }
}

#[test]
fn usage_settlement_requires_explicit_pending_or_failed_status() {
    assert!(
        !compact_sql(POSTGRES_USAGE_SETTLEMENT_STORE).contains("COALESCE(settlement_status, 0) IN"),
        "Postgres usage settlement must not treat NULL settlement_status as pending"
    );
}

#[test]
fn usage_settlement_upserts_bridge_and_returns_ids_without_double_debit() {
    for expected in [
        "INSERT INTO commerce_settlement",
        "ON CONFLICT (tenant_id, organization_id, usage_fact_id) DO UPDATE SET",
        "WHERE commerce_settlement.settlement_status <> $20",
        ".bind(USAGE_SETTLEMENT_SUCCESS)",
        "RETURNING id",
        "INSERT INTO commerce_account_ledger_entry",
        "business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at",
        "'usage'",
        "'ai_usage'",
        "WHERE account_id = $1",
        "AND transaction_no = $2",
    ] {
        assert_sql_contains(POSTGRES_USAGE_SETTLEMENT_STORE, expected);
    }
}

#[test]
fn usage_settlement_debits_account_with_atomic_balance_guard() {
    for expected in [
        "UPDATE commerce_account",
        "version = version + 1",
        "AND COALESCE(available_amount::numeric, 0) >= $3::numeric",
        "usage settlement account points update was not applied atomically",
    ] {
        assert_sql_contains(POSTGRES_USAGE_SETTLEMENT_STORE, expected);
    }
}

#[test]
fn usage_settlement_rounds_points_after_batch_aggregation_without_float_casts() {
    for expected in [
        "fn charge_points_from_scaled",
        "MIN_BILLABLE_POINT_SCALED",
        "DECIMAL_SCALE - 1",
        "fn allocate_candidate_points",
        "fn settlement_batch_no",
    ] {
        assert!(
            POSTGRES_USAGE_SETTLEMENT_STORE.contains(expected),
            "Postgres usage settlement store must keep aggregated point rounding helper `{expected}`"
        );
    }
    assert!(
        !POSTGRES_USAGE_SETTLEMENT_STORE.contains("parse::<f64>"),
        "Postgres usage settlement must not parse financial or id fields through f64"
    );
    assert!(
        !POSTGRES_USAGE_SETTLEMENT_STORE.contains("DECIMAL_SCALE / 2"),
        "Postgres usage settlement must not round customer charges to the nearest point"
    );
}

#[test]
fn usage_settlement_has_no_legacy_plus_account_dependency() {
    for forbidden in [
        "plus_account",
        "plus_account_history",
        "account_history_id",
        "available_points",
        "points_change",
    ] {
        assert!(
            !POSTGRES_USAGE_SETTLEMENT_STORE
                .to_ascii_lowercase()
                .contains(forbidden),
            "Postgres usage settlement store must not keep legacy account design `{forbidden}`"
        );
    }
}

#[test]
fn usage_settlement_marks_success_and_failure_on_source_fact() {
    for expected in [
        "UPDATE ai_usage",
        "SET settlement_status = $1,",
        "settlement_id = $2",
        "INSUFFICIENT_POINTS",
        "failure_code = $2",
        "failure_message = $3",
    ] {
        assert_sql_contains(POSTGRES_USAGE_SETTLEMENT_STORE, expected);
    }
}

#[test]
fn usage_settlement_does_not_persist_plaintext_provider_or_gateway_secrets() {
    for forbidden in [
        "authorization",
        "bearer",
        "api_key_secret",
        "provider_secret",
        "openai_bearer_token",
    ] {
        assert!(
            !POSTGRES_USAGE_SETTLEMENT_STORE
                .to_ascii_lowercase()
                .contains(forbidden),
            "Postgres usage settlement store must not persist plaintext secret field `{forbidden}`"
        );
    }
}
