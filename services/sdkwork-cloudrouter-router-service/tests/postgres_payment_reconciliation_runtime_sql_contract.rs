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
        "(id, tenant_id, organization_id, statement_no, supplier_code, provider_account_id, statement_type, settlement_currency, period_start, period_end, provider_statement_id, file_ref, file_digest, download_status, parse_status, row_count, total_amount, fee_amount, net_amount, downloaded_at, parsed_at, request_no, idempotency_key, created_at, updated_at)",
        "INSERT INTO commerce_payment_statement_item",
        "(id, tenant_id, organization_id, statement_id, supplier_code, provider_account_id, row_no, native_trade_id, native_refund_id, native_order_no, sdkwork_out_trade_no, sdkwork_out_refund_no, transaction_type, occurred_at, settled_at, gross_amount, fee_amount, net_amount, currency_code, provider_status, raw_row_digest, metadata_json, created_at)",
        "INSERT INTO commerce_payment_reconciliation_item",
        "(id, tenant_id, organization_id, reconciliation_run_id, statement_id, statement_item_id, payment_attempt_id, refund_id, refund_attempt_id, supplier_code, difference_type, match_status, internal_amount, provider_amount, difference_amount, currency_code, internal_status, provider_status, resolution_status, resolution_note, resolved_by, resolved_at, created_at, updated_at)",
        "FROM commerce_payment_statement_item",
        "WHERE tenant_id = $1 AND statement_id = $2",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_RECONCILIATION_RUNTIME_STORE, expected);
    }
}

#[test]
fn reconciliation_worker_claims_runs_with_skip_locked_and_running_transition() {
    for expected in [
        "UPDATE commerce_payment_reconciliation_run AS run",
        "SET status = 'running'",
        "run.status IN ('queued', 'pending')",
        "FOR UPDATE OF run SKIP LOCKED",
        "RETURNING run.id, run.tenant_id, run.organization_id, run.run_no, run.provider_code",
        "TO_CHAR(run.period_start AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') AS period_start",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_RECONCILIATION_RUNTIME_STORE, expected);
    }
}

#[test]
fn reconciliation_worker_matches_imported_parsed_statement_by_period() {
    for expected in [
        "FROM commerce_payment_statement",
        "AND supplier_code = $2",
        "AND period_start::timestamptz = $3::timestamptz",
        "AND period_end::timestamptz = $4::timestamptz",
        "AND parse_status = 'parsed'",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_RECONCILIATION_RUNTIME_STORE, expected);
    }
}

#[test]
fn reconciliation_worker_loads_payment_and_refund_ledger_in_period() {
    for expected in [
        "FROM commerce_payment_attempt AS pa",
        "pa.status IN ('created', 'pending', 'processing', 'succeeded', 'closed')",
        "FROM commerce_refund AS r",
        "JOIN commerce_payment_attempt AS pa2",
        "ON pa2.id = r.payment_attempt_id AND pa2.deleted_at IS NULL",
        "r.status IN ('processing', 'succeeded')",
        "AND r.created_at >= $4::timestamptz",
        "AND r.created_at <= $5::timestamptz",
        "COALESCE(NULLIF(pa.out_trade_no, ''), pa.id) AS sdkwork_out_trade_no",
        "COALESCE(NULLIF(r.refund_no, ''), r.id) AS sdkwork_out_refund_no",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_RECONCILIATION_RUNTIME_STORE, expected);
    }
}

#[test]
fn reconciliation_worker_finishes_runs_with_counts_and_numeric_total() {
    for expected in [
        "UPDATE commerce_payment_reconciliation_run",
        "SET status = $2",
        "matched_count = $3",
        "mismatched_count = $4",
        "unmatched_count = $5",
        "total_difference_amount = $6::numeric",
        "version = version + 1",
        "WHERE id = $1",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_RECONCILIATION_RUNTIME_STORE, expected);
    }
}
