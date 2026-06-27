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
        "WHERE pa.provider = $1 AND pa.out_trade_no = $2",
        "FOR UPDATE OF pa, o, pi",
        "required_string_cell(&row, \"status\", \"payment\")?",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
        "FROM plus_payment p",
        "JOIN plus_order o",
        "CAST(COALESCE(p.status, 0) AS TEXT) AS status",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}

#[test]
fn payment_callback_points_account_creation_uses_appbase_account_unique_key_conflict_guard() {
    for expected in [
        "FROM commerce_account",
        "owner_user_id = $3",
        "asset_type = $4",
        "currency_code = $5",
        "ON CONFLICT (tenant_id, organization_id, owner_user_id, asset_type, currency_code) DO NOTHING",
        "RETURNING id",
        "payment callback points account was not available after concurrent creation",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
        "FROM plus_account",
        "INSERT INTO plus_account",
        "ON CONFLICT (tenant_id, organization_id, user_id, account_type) DO NOTHING",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_CALLBACK_STORE, unexpected);
    }
}

#[test]
fn payment_callback_webhook_event_queries_lock_and_scope_idempotency_by_provider_event_and_nonce() {
    for expected in [
        "SELECT event_id FROM commerce_payment_webhook_event WHERE tenant_id = $1 AND provider = $2 AND nonce = $3 LIMIT 1",
        "SELECT id, status FROM commerce_payment_webhook_event WHERE tenant_id = $1 AND provider = $2 AND event_id = $3 LIMIT 1 FOR UPDATE",
        "UPDATE commerce_payment_webhook_event SET status = 'RECEIVED'",
        "RETURNING id",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    assert_sql_not_contains(
        POSTGRES_PAYMENT_CALLBACK_STORE,
        "plus_payment_webhook_event",
    );
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
        "UPDATE commerce_account SET available_amount = (COALESCE(available_amount::numeric, 0) + $1::numeric)::text, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND COALESCE(available_amount::numeric, 0) <= $3::numeric",
        "payment callback account points update was not applied atomically",
        "INSERT INTO commerce_account_ledger_entry",
        "'commerce_payment_attempt'",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_CALLBACK_STORE, expected);
    }

    for unexpected in [
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
