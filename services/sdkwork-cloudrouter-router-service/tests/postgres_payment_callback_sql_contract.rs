const POSTGRES_PAYMENT_CALLBACK_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/payment_callback_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres payment callback SQL must contain `{expected}`"
    );
}

fn assert_sql_not_contains(sql: &str, unexpected: &str) {
    let actual = compact_sql(sql);
    let compact_unexpected = compact_sql(unexpected);
    assert!(
        !actual.contains(&compact_unexpected),
        "Postgres payment callback SQL must not contain `{unexpected}`"
    );
}

#[test]
fn payment_callback_payment_lookup_uses_appbase_order_payment_attempt_and_intent_tables() {
    for expected in [
        "FROM commerce_payment_attempt pa",
        "JOIN commerce_order o",
        "JOIN commerce_payment_intent pi",
        "WHERE pa.provider_code = $1 AND pa.out_trade_no = $2",
        "FOR UPDATE OF pa, o, pi",
        "required_string_cell(&row, \"status\", \"payment\")?",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
        "FROM plus_payment p",
        "JOIN plus_order o",
        "CAST(COALESCE(p.status, 0) AS TEXT) AS status",
        "pa.provider = $1",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}

#[test]
fn payment_callback_recharge_credits_through_the_account_domain_ledger() {
    // S5: recharge credits go through the account-domain port
    // (`PostgresCommerceAccountStore::append_ledger_entry`) keyed by
    // out-trade-no; the legacy commerce_account/ledger SQL is gone.
    // Credits land on the TokenBank asset so usage settlement (which debits
    // the same asset) can spend recharged funds.
    for expected in [
        "PostgresCommerceAccountStore::new(pool.clone())",
        "AppendLedgerEntryCommand",
        "asset_type: CommerceAccountAssetType::TokenBank",
        "direction: CommerceLedgerDirection::Credit",
        "business_type: RECHARGE_BUSINESS_TYPE.to_owned()",
        "idempotency_key: command.out_trade_no.clone()",
        "append_ledger_entry(append, request_hash)",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
        "FROM commerce_account",
        "INSERT INTO commerce_account",
        "INSERT INTO commerce_account_ledger_entry",
        "UPDATE commerce_account SET",
        "ON CONFLICT (tenant_id, organization_id, owner_user_id, asset_type, currency_code) DO NOTHING",
        "FROM plus_account",
        "INSERT INTO plus_account",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}

#[test]
fn payment_callback_webhook_event_queries_lock_and_scope_idempotency_by_provider_and_event() {
    for expected in [
        "SELECT id, status FROM commerce_payment_webhook_event WHERE tenant_id = $1 AND provider_code = $2 AND event_id = $3 LIMIT 1 FOR UPDATE",
        "INSERT INTO commerce_payment_webhook_event (id, tenant_id, organization_id, event_id, event_type, provider_code, payload, status, retries, received_at, created_at, updated_at)",
        "RETURNING id",
        "last_error = CASE WHEN $1 = 'failed' THEN $4 ELSE NULL END",
        "retries = COALESCE(retries, 0) + 1",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
        "provider = $2 AND nonce = $3",
        "SET status = 'RECEIVED'",
        "out_trade_no = $1",
        "plus_payment_webhook_event",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}

#[test]
fn payment_callback_webhook_delivery_uses_canonical_provider_code_column() {
    for expected in [
        "SELECT event_id FROM commerce_payment_webhook_delivery WHERE tenant_id = $1 AND provider_code = $2 AND nonce = $3 LIMIT 1",
        "SELECT id FROM commerce_payment_webhook_delivery WHERE tenant_id = $1 AND provider_code = $2 AND event_id = $3 LIMIT 1 FOR UPDATE",
        "INSERT INTO commerce_payment_webhook_delivery (id, tenant_id, organization_id, delivery_no, provider_code,",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [", supplier_code,", "supplier_code = $"] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}

#[test]
fn payment_callback_success_updates_appbase_payment_order_and_ledger_tables() {
    for expected in [
        "UPDATE commerce_payment_attempt SET status = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = $3",
        "UPDATE commerce_payment_intent SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = $3",
        "UPDATE commerce_order SET status = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status IN ($3, 'pending')",
        "payment callback cannot transition terminal payment to success",
        "payment callback payment is no longer pending",
        "payment callback payment intent is no longer pending",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
        "UPDATE commerce_account SET",
        "INSERT INTO commerce_account_ledger_entry",
        "UPDATE plus_payment SET",
        "UPDATE plus_order",
        "UPDATE plus_account",
        "INSERT INTO plus_account_history",
        "INSERT INTO plus_vip_point_change",
        "UPDATE plus_vip_recharge",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}

#[test]
fn payment_callback_failed_or_closed_updates_appbase_payment_order_without_overwriting_success() {
    for expected in [
        "UPDATE commerce_payment_attempt SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status <> $3",
        "UPDATE commerce_payment_intent SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status <> $3",
        "UPDATE commerce_order SET status = $1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status IN ($3, 'pending')",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
        "UPDATE plus_payment SET status = $1",
        "UPDATE plus_order SET status",
        "UPDATE plus_vip_recharge SET status",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}
