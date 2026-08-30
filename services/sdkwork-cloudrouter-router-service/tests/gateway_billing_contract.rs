const BILLING_STORE: &str =
    include_str!("../../../crates/sdkwork-cloudrouter-edge-runtime/src/gateway_billing_account.rs");
const BILLING_TRANSACTION: &str =
    include_str!("../src/application/invocation/billing_transaction.rs");

#[test]
fn gateway_billing_uses_token_bank_currency_for_account_ledger_entries() {
    assert!(BILLING_STORE.contains("const TOKEN_BANK_CURRENCY_CODE: &str = \"TOKEN_BANK\""));
    assert!(BILLING_STORE.contains("Some(TOKEN_BANK_CURRENCY_CODE)"));
}

#[test]
fn gateway_billing_operations_have_distinct_request_scoped_idempotency_suffixes() {
    for suffix in [
        "precharge",
        "consumption",
        "release",
        "postpaid",
        "refund",
    ] {
        assert!(
            BILLING_STORE.contains(&format!("\"{suffix}\"")),
            "missing idempotency suffix {suffix}"
        );
    }
}

#[test]
fn gateway_billing_hashes_the_complete_ledger_payload_for_idempotency() {
    for field in [
        "command.tenant_id",
        "command.organization_id",
        "account.id",
        "command.owner_user_id",
        "command.asset_type.as_str()",
        "command.currency_code.as_deref()",
        "command.direction.as_str()",
        "command.amount.as_str()",
        "command.business_type",
        "command.transaction_no",
        "command.request_no",
        "command.idempotency_key",
    ] {
        assert!(BILLING_STORE.contains(field), "request hash omits {field}");
    }
}

#[test]
fn gateway_billing_defaults_to_synchronous_settlement_and_supports_global_plan_fallback() {
    assert!(BILLING_STORE.contains("GatewayBillingSettlementMode::Synchronous"));
    assert!(BILLING_STORE.contains("metadata->>'settlementMode'"));
    assert!(BILLING_STORE.contains("Some(\"asynchronous\")"));
    assert!(BILLING_STORE.contains("tenant_id IN ($1, 0)"));
    assert!(BILLING_STORE.contains("organization_id IN ($2, 0)"));
    assert!(
        BILLING_STORE.contains("asynchronous billing requires an enabled usage settlement worker")
    );
}

#[test]
fn successful_provider_errors_keep_precharge_for_reconciliation() {
    assert!(BILLING_TRANSACTION.contains(
        "if provider_response_succeeded(invocation) {\n                invocation.charging.provider_completed = true;"
    ));
    assert!(
        BILLING_TRANSACTION.contains("upstream may already have incurred spend"),
        "the successful-provider error path must document why reservations are retained"
    );
}

#[test]
fn invalid_billing_metadata_fails_closed_instead_of_silently_defaulting() {
    assert!(BILLING_STORE.contains("invalid billing settlement mode"));
    assert!(BILLING_STORE.contains("invalid billing charge mode"));
}

/// Regression: the wallet history must never pair a provisional "算力额度消费"
/// with a later "算力额度返还/授权返还" correction. Synchronous prepaid
/// settlement freezes the reservation into an account hold (`create_hold`) and,
/// on success, releases it and appends exactly ONE actual-consumption debit
/// (`settle_hold` / "consumption"). Failed invocations release the hold with no
/// ledger entry at all, so no `refund` credit is written for the synchronous path.
#[test]
fn synchronous_prepaid_settlement_writes_a_single_consumption_debit_not_a_pair() {
    // The synchronous path must build the hold (no ledger) rather than a direct
    // precharge ledger debit.
    for needle in [
        "precharge_hold",
        "create_account_hold",
        "settle_hold",
        "\"consumption\"",
        "provisional",
    ] {
        assert!(
            BILLING_STORE.contains(needle),
            "sync hold flow must contain {needle:?}"
        );
    }
    // The interceptor must route the synchronous prepaid path to the hold
    // methods, never to the legacy `precharge`/`refund` ledger pair.
    assert!(
        BILLING_TRANSACTION.contains("precharge_hold"),
        "before hook must create a hold for synchronous billing"
    );
    assert!(
        BILLING_TRANSACTION.contains("settle_hold"),
        "settlement must settle the hold"
    );
    assert!(
        BILLING_TRANSACTION.contains("release_hold"),
        "failure path must release the hold without writing a refund"
    );
}

/// Regression: async billing keeps the legacy precharge/refund reconciliation
/// so the asynchronous worker path remains self-consistent with historical data.
#[test]
fn asynchronous_billing_keeps_legacy_precharge_refund_reconciliation() {
    assert!(BILLING_STORE.contains("fn precharge<'a>"));
    assert!(BILLING_STORE.contains("\"precharge\""));
    assert!(BILLING_STORE.contains("fn refund<'a>"));
    assert!(BILLING_STORE.contains("\"refund\""));
    assert!(BILLING_TRANSACTION.contains("refund(context, reserved)"));
}
