const POSTGRES_PAYMENT_INTENT_RUNTIME_STORE: &str =
    include_str!("../src/infrastructure/sql/postgres/payment_intent_runtime_store.rs");

fn compact_sql(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn assert_sql_contains(sql: &str, expected: &str) {
    let actual = compact_sql(sql);
    let compact_expected = compact_sql(expected);
    assert!(
        actual.contains(&compact_expected),
        "Postgres payment intent runtime SQL must contain `{expected}`"
    );
}

fn assert_sql_not_contains(sql: &str, unexpected: &str) {
    let actual = compact_sql(sql);
    let compact_unexpected = compact_sql(unexpected);
    assert!(
        !actual.contains(&compact_unexpected),
        "Postgres payment intent runtime SQL must not contain `{unexpected}`"
    );
}

#[test]
fn payment_intent_runtime_loads_by_tenant_scoped_idempotency_and_id() {
    for expected in [
        "FROM commerce_payment_intent",
        "WHERE tenant_id = $1 AND idempotency_key = $2",
        "WHERE tenant_id = $1 AND id = $2",
        "LIMIT 1",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_INTENT_RUNTIME_STORE, expected);
    }
}

#[test]
fn payment_intent_runtime_create_writes_intent_attempt_and_route_decision_in_one_transaction() {
    for expected in [
        "failed to begin payment intent transaction",
        "INSERT INTO commerce_payment_intent",
        "(id, tenant_id, organization_id, owner_user_id, order_id, merchant_order_no, subject, provider, supplier_code, payment_method, scene_code, amount, currency_code, status, request_no, idempotency_key, metadata_json, provider_native_json, next_action_json, captured_amount, refunded_amount, created_at, updated_at)",
        "INSERT INTO commerce_payment_attempt",
        "(id, tenant_id, organization_id, owner_user_id, payment_intent_id, order_id, provider, out_trade_no, amount, currency_code, status, callback_payload, created_at, paid_at, updated_at)",
        "INSERT INTO commerce_payment_route_decision",
        "(id, tenant_id, organization_id, payment_intent_id, payment_attempt_id, route_rule_id, account_id, supplier_code, provider_account_id, method_code, scene_code, country_code, currency_code, amount, risk_level, decision_reason, fallback_from_account_id, created_at)",
        "failed to commit payment intent transaction",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_INTENT_RUNTIME_STORE, expected);
    }

    for unexpected in [
        "plus_payment",
        "legacy_provider_id",
        "provider_key",
        "block_in_place",
    ] {
        assert_sql_not_contains(POSTGRES_PAYMENT_INTENT_RUNTIME_STORE, unexpected);
    }
}

#[test]
fn payment_intent_runtime_records_and_finishes_provider_operation_attempts() {
    for expected in [
        "INSERT INTO commerce_payment_operation_attempt",
        "(id, tenant_id, organization_id, operation_no, supplier_code, provider_account_id, account_id, operation_code, sdkwork_resource_type, sdkwork_resource_id, idempotency_key, request_digest, response_digest, native_request_id, native_trade_id, native_refund_id, http_status, provider_error_code, provider_error_message, retryable, status, started_at, completed_at, created_at)",
        "UPDATE commerce_payment_operation_attempt SET status = $1, response_digest = $2, provider_error_code = $3, provider_error_message = $4, completed_at = $5 WHERE id = $6",
        "FROM commerce_payment_operation_attempt",
        "WHERE id = $1",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_INTENT_RUNTIME_STORE, expected);
    }
}

#[test]
fn payment_refund_runtime_writes_refund_attempt_event_and_operation_contract() {
    for expected in [
        "INSERT INTO commerce_refund",
        "(id, tenant_id, organization_id, payment_intent_id, payment_attempt_id, refund_no, amount, currency_code, supplier_code, reason, status, request_no, idempotency_key, created_at, updated_at)",
        "INSERT INTO commerce_refund_attempt",
        "(id, tenant_id, organization_id, refund_attempt_no, refund_id, supplier_code, provider_account_id, out_refund_no, provider_refund_id, amount, currency_code, status, failure_code, failure_message, submitted_at, succeeded_at, failed_at, created_at, updated_at)",
        "INSERT INTO commerce_refund_item",
        "(id, tenant_id, organization_id, refund_id, order_item_id, quantity, refund_amount, tax_refund_amount, shipping_refund_amount, created_at)",
        "FROM commerce_refund_item",
        "UPDATE commerce_refund_attempt SET status = $1",
        "UPDATE commerce_refund SET status = $1",
        "INSERT INTO commerce_refund_event",
        "(id, tenant_id, organization_id, refund_id, event_type, from_status, to_status, reason, created_at)",
        "\"create_refund\" => Ok(crate::application::PaymentAdapterOperation::CreateRefund)",
        "\"cancel_refund\" => Ok(crate::application::PaymentAdapterOperation::CancelRefund)",
    ] {
        assert_sql_contains(POSTGRES_PAYMENT_INTENT_RUNTIME_STORE, expected);
    }
}
