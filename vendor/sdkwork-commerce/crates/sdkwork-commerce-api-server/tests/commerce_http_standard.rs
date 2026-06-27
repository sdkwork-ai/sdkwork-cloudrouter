use sdkwork_commerce_api_server::{
    app_route_execution_metadata, app_routes, backend_routes, commerce_http_response_envelope,
    commerce_http_runtime_input_binding, required_dual_token_headers, CommerceHttpRoute,
    HttpMethod, APP_API_PREFIX, BACKEND_API_PREFIX, COMMERCE_APP_HTTP_ROUTES,
    COMMERCE_BACKEND_HTTP_ROUTES,
};
use sdkwork_commerce_contract_service::OperationExecutionPolicy;
use sdkwork_commerce_service_host::resolve_operation_contract;
use std::collections::HashSet;

fn route_specs(routes: &[CommerceHttpRoute]) -> Vec<(HttpMethod, &str, &str)> {
    routes
        .iter()
        .map(|route| (route.method.clone(), route.path, route.operation_id))
        .collect()
}

fn assert_unique_route_specs(routes: &[(HttpMethod, &str, &str)]) {
    let mut route_keys = HashSet::new();
    let mut operation_ids = HashSet::new();

    for (method, path, operation_id) in routes {
        assert!(
            route_keys.insert(format!("{method:?}:{path}")),
            "route method/path must be unique: {method:?} {path}"
        );
        assert!(
            operation_ids.insert(*operation_id),
            "route operationId must be unique: {operation_id}"
        );
    }
}

#[test]
fn exposes_standard_app_commerce_routes_from_manifest() {
    let routes = app_routes();
    let actual = route_specs(&routes);

    assert_eq!(APP_API_PREFIX, "/app/v3/api");
    assert_eq!(routes.len(), COMMERCE_APP_HTTP_ROUTES.len());
    assert!(!routes.is_empty());

    for route in &routes {
        assert!(route.path.starts_with("/app/v3/api/"));
        assert!(route.path == "/app/v3/api/billing/history" || !route.path.contains("/billing/"));
        assert!(!route.path.contains("/vip/"));
        assert!(!route.path.contains("/shops/{shopId}/staff"));
        assert!(!route.path.contains("/shops/{shopId}/members"));
        assert!(!route.path.contains("/shops/{shopId}/roles"));
        assert!(!route.path.contains("/shops/{shopId}/permissions"));
        assert!(!route.path.contains("__"));
        assert!(!route.operation_id.contains('_'));
        assert!(route.operation_id.contains('.'));
        assert!(!route.operation_id.starts_with("vip."));
        assert!(!route.operation_id.starts_with("shops.staff."));
        assert!(!route.operation_id.starts_with("shops.members."));
        assert!(!route.operation_id.starts_with("shops.roles."));
        assert!(!route.operation_id.starts_with("shops.permissions."));
    }
    assert_unique_route_specs(&actual);

    for retired_path in [
        "/app/v3/api/wallet/operations/{requestNo}",
        "/app/v3/api/wallet/topups",
        "/app/v3/api/wallet/withdrawals",
        "/app/v3/api/wallet/transfers",
        "/app/v3/api/wallet/exchanges",
        "/app/v3/api/wallet/tokens/deductions",
        "/app/v3/api/wallet/points/exchanges",
        "/app/v3/api/wallet/points/exchanges/{exchangeNo}",
        "/app/v3/api/coupons",
        "/app/v3/api/coupons/claims",
        "/app/v3/api/coupons/redemptions",
        "/app/v3/api/coupons/catalog",
        "/app/v3/api/coupons/catalog/{couponId}",
        "/app/v3/api/coupons/user_coupons/{userCouponId}",
        "/app/v3/api/coupons/usage",
        "/app/v3/api/coupons/usage_reversals",
        "/app/v3/api/payments/attempts",
        "/app/v3/api/checkout/preflight/estimates",
        "/app/v3/api/checkout/preflight/prechecks",
        "/app/v3/api/checkout/preflight/preholds",
        "/app/v3/api/checkout/preflight/settlements",
        "/app/v3/api/checkout/preflight/releases",
    ] {
        assert!(
            !actual.iter().any(|(_, path, _)| path == &retired_path),
            "retired appbase app route must not be exposed: {retired_path}"
        );
    }
    for retired_operation_id in [
        "wallet.operations.retrieve",
        "wallet.topups.create",
        "wallet.withdrawals.create",
        "wallet.transfers.create",
        "wallet.exchanges.create",
        "wallet.tokens.deductions.create",
        "wallet.points.exchanges.rules.list",
        "wallet.points.exchanges.create",
        "wallet.points.exchanges.retrieve",
        "coupons.list",
        "coupons.claims.create",
        "coupons.redemptions.create",
        "coupons.catalog.list",
        "coupons.catalog.retrieve",
        "coupons.userCoupons.retrieve",
        "coupons.usage.create",
        "coupons.usageReversals.create",
        "payments.attempts.list",
        "checkout.preflight.estimates.create",
        "checkout.preflight.prechecks.create",
        "checkout.preflight.preholds.create",
        "checkout.preflight.settlements.create",
        "checkout.preflight.releases.create",
    ] {
        assert!(
            !actual
                .iter()
                .any(|(_, _, operation_id)| operation_id == &retired_operation_id),
            "retired appbase app operationId must not be exposed: {retired_operation_id}"
        );
    }
}

#[test]
fn exposes_standard_backend_commerce_routes_from_manifest() {
    let routes = backend_routes();
    let actual = route_specs(&routes);

    assert_eq!(BACKEND_API_PREFIX, "/backend/v3/api");
    assert_eq!(routes.len(), COMMERCE_BACKEND_HTTP_ROUTES.len());
    assert!(!routes.is_empty());

    for route in &routes {
        assert!(route.path.starts_with("/backend/v3/api/"));
        assert!(!route.path.contains("/billing/"));
        assert!(!route.path.contains("/vip/"));
        assert!(!route.path.contains("/shops/{shopId}/staff"));
        assert!(!route.path.contains("/shops/{shopId}/members"));
        assert!(!route.path.contains("/shops/{shopId}/roles"));
        assert!(!route.path.contains("/shops/{shopId}/permissions"));
        assert_ne!(route.path, "/backend/v3/api/inventory/ledger");
        assert_ne!(route.path, "/backend/v3/api/inventory/ledger_entries");
        assert!(!route.operation_id.contains('_'));
        assert!(route.operation_id.contains('.'));
        assert!(!route.operation_id.starts_with("backend."));
        assert!(!route.operation_id.starts_with("vip."));
        assert!(!route.operation_id.starts_with("shops.staff."));
        assert!(!route.operation_id.starts_with("shops.members."));
        assert!(!route.operation_id.starts_with("shops.roles."));
        assert!(!route.operation_id.starts_with("shops.permissions."));
        assert_ne!(route.operation_id, "inventory.ledger.list");
        assert_ne!(route.operation_id, "inventory.ledgerEntries.list");
    }
    assert_unique_route_specs(&actual);

    for retired_path in [
        "/backend/v3/api/orders/management",
        "/backend/v3/api/refunds/management",
        "/backend/v3/api/payments/webhooks",
    ] {
        assert!(
            !actual
                .iter()
                .any(|(_, path, _)| path.starts_with(retired_path)),
            "retired backend management path must not be exposed: {retired_path}"
        );
    }

    for retired_operation_id in [
        "shops.retrieve",
        "catalog.categories.list",
        "catalog.attributes.list",
        "catalog.products.list",
        "orders.list",
        "orders.retrieve",
        "orders.cancel",
        "orders.close",
        "orders.events.list",
        "payments.methods.list",
        "payments.intents.retrieve",
        "refunds.list",
        "refunds.retrieve",
        "fulfillments.list",
        "fulfillments.retrieve",
        "shipments.retrieve",
        "memberships.packageGroups.list",
        "memberships.packages.list",
        "recharges.packages.list",
        "recharges.settings.retrieve",
        "recharges.orders.list",
        "recharges.orders.retrieve",
        "wallet.ledgerEntries.list",
        "wallet.adjustments.create",
        "wallet.exchangeRules.list",
        "invoices.retrieve",
    ] {
        assert!(
            !actual
                .iter()
                .any(|(_, _, operation_id)| operation_id == &retired_operation_id),
            "retired backend operationId must not be exposed: {retired_operation_id}"
        );
    }
}

#[test]
fn requires_dual_token_headers_for_private_runtime_parity() {
    assert_eq!(
        required_dual_token_headers(),
        ["Authorization", "Access-Token"]
    );
}

#[test]
fn app_routes_expose_runtime_execution_metadata_for_handler_generation() {
    let metadata = app_route_execution_metadata();
    let routes = app_routes();

    assert_eq!(metadata.len(), routes.len());

    let checkout_order = metadata
        .iter()
        .find(|entry| entry.operation_id == "checkout.sessions.orders.create")
        .unwrap();
    assert_eq!(checkout_order.service_name, "commerce.order");
    assert_eq!(
        checkout_order.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert_eq!(checkout_order.capability_name, "commerce.order.lifecycle");
    assert!(checkout_order.requires_idempotency);
    assert!(checkout_order.requires_transaction);

    let account_summary = metadata
        .iter()
        .find(|entry| entry.operation_id == "accounts.current.summary.retrieve")
        .unwrap();
    assert_eq!(account_summary.service_name, "commerce.account");
    assert_eq!(
        account_summary.execution_policy,
        OperationExecutionPolicy::ReadOnly,
    );
    assert_eq!(account_summary.capability_name, "commerce.account.summary");
    assert!(!account_summary.requires_idempotency);
    assert!(!account_summary.requires_transaction);

    let cart_update = metadata
        .iter()
        .find(|entry| entry.operation_id == "cart.items.update")
        .unwrap();
    assert_eq!(cart_update.service_name, "commerce.catalog");
    assert_eq!(
        cart_update.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert_eq!(cart_update.capability_name, "commerce.catalog.cart");
    assert!(cart_update.requires_idempotency);
    assert!(cart_update.requires_transaction);

    let after_sales_create = metadata
        .iter()
        .find(|entry| entry.operation_id == "afterSales.requests.create")
        .unwrap();
    assert_eq!(after_sales_create.service_name, "commerce.order");
    assert_eq!(
        after_sales_create.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert_eq!(
        after_sales_create.capability_name,
        "commerce.order.afterSales"
    );
    assert!(after_sales_create.requires_idempotency);
    assert!(after_sales_create.requires_transaction);

    let after_sales_events = metadata
        .iter()
        .find(|entry| entry.operation_id == "afterSales.events.list")
        .unwrap();
    assert_eq!(after_sales_events.service_name, "commerce.order");
    assert_eq!(
        after_sales_events.execution_policy,
        OperationExecutionPolicy::ReadOnly,
    );
    assert_eq!(
        after_sales_events.capability_name,
        "commerce.order.afterSales"
    );
    assert!(!after_sales_events.requires_idempotency);
    assert!(!after_sales_events.requires_transaction);

    let shop_application = metadata
        .iter()
        .find(|entry| entry.operation_id == "shops.current.applications.create")
        .unwrap();
    assert_eq!(shop_application.service_name, "commerce.shop");
    assert_eq!(
        shop_application.execution_policy,
        OperationExecutionPolicy::TransactionalWrite,
    );
    assert_eq!(shop_application.capability_name, "commerce.shop.onboarding");
    assert!(shop_application.requires_idempotency);
    assert!(shop_application.requires_transaction);

    let shop_settlement_profile = metadata
        .iter()
        .find(|entry| entry.operation_id == "shops.current.settlementProfile.retrieve")
        .unwrap();
    assert_eq!(shop_settlement_profile.service_name, "commerce.shop");
    assert_eq!(
        shop_settlement_profile.execution_policy,
        OperationExecutionPolicy::ReadOnly,
    );
    assert_eq!(
        shop_settlement_profile.capability_name,
        "commerce.shop.settlement"
    );
    assert!(!shop_settlement_profile.requires_idempotency);
    assert!(!shop_settlement_profile.requires_transaction);

    let exchange_rules = metadata
        .iter()
        .find(|entry| entry.operation_id == "wallet.points.exchangeRules.list")
        .unwrap();
    assert_eq!(exchange_rules.service_name, "commerce.promotion");
    assert_eq!(
        exchange_rules.execution_policy,
        OperationExecutionPolicy::ReadOnly,
    );
    assert_eq!(exchange_rules.capability_name, "commerce.promotion.points");
    assert!(!exchange_rules.requires_idempotency);
    assert!(!exchange_rules.requires_transaction);
}

#[test]
fn http_routes_declare_the_standard_runtime_response_envelope() {
    let envelope = commerce_http_response_envelope();

    assert_eq!(envelope.name, "CommerceRuntimeOperationEnvelope");
    assert_eq!(
        envelope.fields,
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
    assert_eq!(envelope.error_fields, vec!["code", "message"],);
    assert!(envelope.applies_to_app_routes);
    assert!(envelope.applies_to_tauri_commands);

    for route in app_routes() {
        assert_eq!(
            route.response_envelope_name,
            "CommerceRuntimeOperationEnvelope"
        );
    }
}

#[test]
fn http_routes_declare_how_requests_map_into_runtime_operation_input() {
    let binding = commerce_http_runtime_input_binding();

    assert_eq!(binding.input_type, "CommerceRuntimeOperationInput");
    assert_eq!(binding.operation_id_source, "route.operation_id");
    assert_eq!(binding.body_json_source, "request.body_json");
    assert_eq!(
        binding.context_source,
        "request.authenticated_runtime_context"
    );
    assert_eq!(binding.capabilities_source, "runtime.capability_manifest");
    assert_eq!(binding.idempotency_key_header, "Idempotency-Key");
    assert_eq!(binding.request_hash_header, "Sdkwork-Request-Hash");
    assert_eq!(
        binding.required_context_fields,
        vec![
            "tenant_id",
            "organization_id",
            "user_id",
            "session_id",
            "app_id",
            "deployment_mode",
            "environment",
            "surface_profile",
        ],
    );
    assert!(binding.applies_to_app_routes);
    assert!(!binding.applies_to_backend_routes);

    for route in app_routes() {
        assert_eq!(
            route.runtime_input_binding_name,
            "CommerceRuntimeOperationInput"
        );
    }
}

#[test]
fn all_manifest_routes_register_runtime_operation_contracts() {
    for route in COMMERCE_APP_HTTP_ROUTES
        .iter()
        .chain(COMMERCE_BACKEND_HTTP_ROUTES.iter())
    {
        resolve_operation_contract(route.operation_id).unwrap_or_else(|_| {
            panic!(
                "route manifest operation must bind to runtime contract: {}",
                route.operation_id
            )
        });
    }
}

#[test]
fn route_tables_match_materialized_route_manifest_slices() {
    fn manifest_specs(routes: &[sdkwork_web_contract::HttpRoute]) -> Vec<(HttpMethod, &str, &str)> {
        routes
            .iter()
            .map(|route| {
                let method = match route.method {
                    sdkwork_web_contract::HttpMethod::Delete => HttpMethod::Delete,
                    sdkwork_web_contract::HttpMethod::Get => HttpMethod::Get,
                    sdkwork_web_contract::HttpMethod::Patch => HttpMethod::Patch,
                    sdkwork_web_contract::HttpMethod::Post => HttpMethod::Post,
                    sdkwork_web_contract::HttpMethod::Put => HttpMethod::Put,
                };
                (method, route.path, route.operation_id)
            })
            .collect()
    }

    let app_actual: Vec<_> = app_routes()
        .iter()
        .map(|route| (route.method.clone(), route.path, route.operation_id))
        .collect();
    let backend_actual: Vec<_> = backend_routes()
        .iter()
        .map(|route| (route.method.clone(), route.path, route.operation_id))
        .collect();

    assert_eq!(app_actual, manifest_specs(COMMERCE_APP_HTTP_ROUTES));
    assert_eq!(backend_actual, manifest_specs(COMMERCE_BACKEND_HTTP_ROUTES));
}
