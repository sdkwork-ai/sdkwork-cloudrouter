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
fn usage_settlement_locks_pending_usage_facts_in_one_transaction() {
    for expected in [
        "FROM ai_metering_usage",
        "($1 <= 0 OR tenant_id = $1)",
        "($2 <= 0 OR organization_id = $2)",
        "settlement_status = $3",
        "settlement_status = $4",
        "settled_at < now() - interval '5 minutes'",
        "ORDER BY COALESCE(occurred_at, CURRENT_TIMESTAMP), id",
        "FOR UPDATE SKIP LOCKED",
    ] {
        assert_sql_contains(POSTGRES_USAGE_SETTLEMENT_STORE, expected);
    }
}

#[test]
fn usage_settlement_bounds_pricing_snapshot_bytes_before_loading_json_text() {
    for expected in [
        "AS pricing_snapshot_bytes",
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
fn usage_settlement_debits_through_account_port_without_legacy_ledger_sql() {
    assert!(
        compact_sql(POSTGRES_USAGE_SETTLEMENT_STORE).contains("append_ledger_entry"),
        "Postgres usage settlement must debit through the account-domain port"
    );
    assert!(
        compact_sql(POSTGRES_USAGE_SETTLEMENT_STORE).contains("AppendLedgerEntryCommand"),
        "Postgres usage settlement must build an account append command"
    );
    for forbidden in [
        "INSERT INTO commerce_settlement",
        "FROM commerce_settlement",
        "INSERT INTO commerce_account",
        "FROM commerce_account",
        "UPDATE commerce_account",
        "INSERT INTO commerce_account_ledger_entry",
        "FROM commerce_account_ledger_entry",
    ] {
        assert!(
            !compact_sql(POSTGRES_USAGE_SETTLEMENT_STORE).contains(forbidden),
            "Postgres usage settlement must not write/read legacy wallet SQL `{forbidden}`"
        );
    }
}

#[test]
fn usage_settlement_uses_batch_no_as_idempotency_key_and_transaction_no() {
    for expected in [
        "USAGE_SETTLEMENT_BUSINESS_TYPE",
        "transaction_no: transaction_id.to_owned()",
        "request_no: transaction_id.to_owned()",
        "idempotency_key: transaction_id.to_owned()",
        "settlement_request_hash",
        "CommerceAccountAssetType::TokenBank",
        "TOKEN_BANK_CURRENCY_CODE",
        "CommerceLedgerDirection::Debit",
        "INSUFFICIENT_BALANCE_MESSAGE",
        "INSUFFICIENT_TOKEN_BANK",
    ] {
        assert!(
            POSTGRES_USAGE_SETTLEMENT_STORE.contains(expected),
            "Postgres usage settlement store must keep account-port contract `{expected}`"
        );
    }
}

#[test]
fn usage_settlement_rounds_tokens_after_batch_aggregation_without_float_casts() {
    for expected in [
        "fn charge_tokens_from_scaled",
        "MIN_BILLABLE_TOKEN_SCALED",
        "DECIMAL_SCALE - 1",
        "fn allocate_candidate_tokens",
        "fn settlement_batch_no",
    ] {
        assert!(
            POSTGRES_USAGE_SETTLEMENT_STORE.contains(expected),
            "Postgres usage settlement store must keep aggregated token rounding helper `{expected}`"
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
        "UPDATE ai_metering_usage",
        "SET settlement_status = $1,",
        "settlement_id = $2",
        "settled_at = $3::timestamp AT TIME ZONE 'UTC'",
        "INSUFFICIENT_TOKEN_BANK",
        "failure_code = $3",
        "failure_message = $4",
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
