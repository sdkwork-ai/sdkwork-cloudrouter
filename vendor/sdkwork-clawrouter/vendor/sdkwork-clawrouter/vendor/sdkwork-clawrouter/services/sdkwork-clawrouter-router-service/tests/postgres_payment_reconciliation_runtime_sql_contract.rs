const POSTGRES_PAYMENT_RECONCILIATION_RUNTIME_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/payment_reconciliation_runtime_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres payment reconciliation runtime SQL must contain `{expected}`"
    );
}

#[test]
fn payment_reconciliation_runtime_writes_statement_items_and_differences() {
    for expected in [
        "INSERT INTO commerce_payment_statement",
        "(id, tenant_id, organization_id, statement_no, provider_code, provider_account_id, statement_type, settlement_currency, period_start, period_end, provider_statement_id, file_ref, file_digest, download_status, parse_status, row_count, total_amount, fee_amount, net_amount, downloaded_at, parsed_at, request_no, idempotency_key, created_at, updated_at)",
        "INSERT INTO commerce_payment_statement_item",
        "(id, tenant_id, organization_id, statement_id, provider_code, provider_account_id, row_no, native_trade_id, native_refund_id, native_order_no, sdkwork_out_trade_no, sdkwork_out_refund_no, transaction_type, occurred_at, settled_at, gross_amount, fee_amount, net_amount, currency_code, provider_status, raw_row_digest, metadata_json, created_at)",
        "INSERT INTO commerce_payment_reconciliation_item",
        "(id, tenant_id, organization_id, reconciliation_run_id, statement_id, statement_item_id, payment_attempt_id, refund_id, refund_attempt_id, provider_code, difference_type, match_status, internal_amount, provider_amount, difference_amount, currency_code, internal_status, provider_status, resolution_status, resolution_note, resolved_by, resolved_at, created_at, updated_at)",
        "FROM commerce_payment_statement_item",
        "WHERE tenant_id = $1 AND statement_id = $2",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_RECONCILIATION_RUNTIME_STORE, expected);
    }
}
