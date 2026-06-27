use sdkwork_commerce_contract_service::OperationExecutionPolicy;
use sdkwork_commerce_tauri_host::commerce_tauri_adapter_manifest;
use std::collections::HashSet;

#[test]
fn exposes_tauri_adapter_manifest_for_local_private_commerce_runtime() {
    let manifest = commerce_tauri_adapter_manifest();

    assert_eq!(manifest.plugin_name, "sdkwork-commerce");
    assert_eq!(manifest.command_bindings.len(), manifest.commands.len());
    assert_eq!(
        manifest.commands.iter().collect::<HashSet<_>>().len(),
        manifest.commands.len()
    );
    assert_eq!(
        manifest
            .command_bindings
            .iter()
            .map(|binding| binding.command)
            .collect::<HashSet<_>>()
            .len(),
        manifest.command_bindings.len()
    );
    assert_eq!(
        manifest
            .app_routes
            .iter()
            .map(|route| route.operation_id)
            .collect::<HashSet<_>>()
            .len(),
        manifest.app_routes.len()
    );
    assert_eq!(
        manifest.response_envelope.name,
        "CommerceRuntimeOperationEnvelope"
    );
    assert_eq!(
        manifest.response_envelope.fields,
        vec![
            "ok",
            "operation_id",
            "service_name",
            "body_json",
            "outcome_kind",
            "idempotency_scope",
            "error",
        ],
    );
    assert_eq!(
        manifest.response_envelope.error_fields,
        vec!["code", "message"]
    );
    assert_eq!(
        manifest.runtime_input_binding.input_type,
        "CommerceRuntimeOperationInput"
    );
    assert_eq!(
        manifest.runtime_input_binding.context_source,
        "tauri.authenticated_runtime_context",
    );
    assert_eq!(
        manifest.runtime_input_binding.body_json_source,
        "command.payload_json",
    );
    assert_eq!(
        manifest.runtime_input_binding.idempotency_key_header,
        "Idempotency-Key",
    );
    assert_eq!(
        manifest.runtime_input_binding.request_hash_header,
        "Sdkwork-Request-Hash",
    );
    for command in [
        "commerce_account_summary",
        "commerce_addresses_create",
        "commerce_cart_current_retrieve",
        "commerce_catalog_products_list",
        "commerce_checkout_sessions_orders_create",
        "commerce_promotions_offers_list",
        "commerce_promotions_user_coupon_claims_create",
        "commerce_payments_intents_create",
        "commerce_refunds_create",
        "commerce_memberships_purchases_create",
        "commerce_wallet_exchange_rate_retrieve",
        "commerce_wallet_points_exchange_rules_list",
        "commerce_recharges_orders_create",
        "commerce_invoices_create",
    ] {
        assert!(manifest.commands.contains(&command));
    }
    for command in &manifest.commands {
        assert!(!command.contains("vip"));
        assert!(!command.contains("payments_records"));
        assert!(!command.contains("payments_checkout"));
        assert!(!command.contains("account_points"));
        assert!(!command.contains("account_tokens"));
        assert!(!command.contains("preflight"));
        assert!(!command.contains("topups"));
        assert!(!command.contains("deductions"));
        assert!(!command.contains("catalog_retrieve"));
        assert!(!command.contains("submissions"));
    }
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/orders"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.operation_id == "payments.intents.create"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.operation_id == "payments.intents.attempts.create"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/promotions/user_coupons"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/cart/current"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/catalog/products"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/catalog/spus"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/wallet/exchange_rate"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/wallet/transactions"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/recharges/orders"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/payments/attempts/{paymentAttemptId}"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/checkout/sessions/{checkoutSessionId}/orders"));
    assert!(manifest
        .app_routes
        .iter()
        .any(|route| route.path == "/app/v3/api/memberships/package_groups"));
    assert!(manifest.app_routes.iter().all(|route| {
        (route.path == "/app/v3/api/billing/history" || !route.path.contains("/billing"))
            && !route.path.contains("/vip")
            && !route.path.contains("/pack_groups")
            && !route.path.contains("/packs")
    }));
    for retired_path in [
        "/app/v3/api/wallet/topups",
        "/app/v3/api/wallet/tokens/deductions",
        "/app/v3/api/wallet/points/exchanges/{exchangeNo}",
        "/app/v3/api/coupons",
        "/app/v3/api/coupons/claims",
        "/app/v3/api/coupons/redemptions",
        "/app/v3/api/coupons/catalog/{couponId}",
        "/app/v3/api/checkout/preflight/estimates",
    ] {
        assert!(!manifest
            .app_routes
            .iter()
            .any(|route| route.path == retired_path));
    }
    assert_eq!(
        manifest
            .command_bindings
            .iter()
            .find(|binding| binding.command == "commerce_coupons_redeem")
            .map(|binding| binding.service_name),
        None,
    );
    assert_eq!(
        manifest
            .command_bindings
            .iter()
            .find(|binding| binding.command == "commerce_memberships_purchases_create")
            .map(|binding| binding.operation_id),
        Some("memberships.purchases.create"),
    );
    let create_order = manifest
        .command_bindings
        .iter()
        .find(|binding| binding.command == "commerce_checkout_sessions_orders_create")
        .unwrap();
    assert_eq!(create_order.operation_id, "checkout.sessions.orders.create");
    assert_eq!(
        create_order.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert_eq!(create_order.capability_name, "commerce.order.lifecycle");
    assert!(create_order.requires_idempotency);
    assert!(create_order.requires_transaction);
    assert_eq!(
        create_order.response_envelope_name,
        "CommerceRuntimeOperationEnvelope"
    );
    assert_eq!(
        create_order.runtime_input_binding_name,
        "CommerceRuntimeOperationInput",
    );

    let wallet_exchange_rate = manifest
        .command_bindings
        .iter()
        .find(|binding| binding.command == "commerce_wallet_exchange_rate_retrieve")
        .unwrap();
    assert_eq!(
        wallet_exchange_rate.operation_id,
        "wallet.exchangeRate.retrieve"
    );
    assert_eq!(wallet_exchange_rate.service_name, "commerce.promotion");
    assert_eq!(
        wallet_exchange_rate.execution_policy,
        OperationExecutionPolicy::ReadOnly,
    );

    let account_summary = manifest
        .command_bindings
        .iter()
        .find(|binding| binding.command == "commerce_account_summary")
        .unwrap();
    assert_eq!(
        account_summary.execution_policy,
        OperationExecutionPolicy::ReadOnly,
    );
    assert_eq!(account_summary.capability_name, "commerce.account.summary");
    assert!(!account_summary.requires_idempotency);
    assert!(!account_summary.requires_transaction);
    assert_eq!(
        account_summary.response_envelope_name,
        "CommerceRuntimeOperationEnvelope"
    );
    assert_eq!(
        account_summary.runtime_input_binding_name,
        "CommerceRuntimeOperationInput",
    );
}
