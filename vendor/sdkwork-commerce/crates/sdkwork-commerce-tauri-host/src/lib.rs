use sdkwork_commerce_api_server::{
    app_routes, commerce_http_response_envelope, commerce_tauri_runtime_input_binding,
    CommerceHttpResponseEnvelope, CommerceHttpRoute, CommerceRuntimeInputBinding,
    COMMERCE_RUNTIME_OPERATION_ENVELOPE_NAME, COMMERCE_RUNTIME_OPERATION_INPUT_NAME,
};
use sdkwork_commerce_contract_service::OperationExecutionPolicy;
use sdkwork_commerce_service_host::resolve_operation_contract;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceTauriAdapterManifest {
    pub app_routes: Vec<CommerceHttpRoute>,
    pub command_bindings: Vec<CommerceTauriCommandBinding>,
    pub commands: Vec<&'static str>,
    pub plugin_name: &'static str,
    pub response_envelope: CommerceHttpResponseEnvelope,
    pub runtime_input_binding: CommerceRuntimeInputBinding,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceTauriCommandBinding {
    pub command: &'static str,
    pub operation_id: &'static str,
    pub service_name: &'static str,
    pub execution_policy: OperationExecutionPolicy,
    pub capability_name: &'static str,
    pub requires_idempotency: bool,
    pub requires_transaction: bool,
    pub response_envelope_name: &'static str,
    pub runtime_input_binding_name: &'static str,
}

pub fn commerce_tauri_adapter_manifest() -> CommerceTauriAdapterManifest {
    let command_operation_ids = command_operation_ids();
    CommerceTauriAdapterManifest {
        app_routes: app_routes(),
        command_bindings: command_bindings(),
        commands: command_operation_ids
            .iter()
            .map(|(command, _)| *command)
            .collect::<Vec<_>>(),
        plugin_name: "sdkwork-commerce",
        response_envelope: commerce_http_response_envelope(),
        runtime_input_binding: commerce_tauri_runtime_input_binding(),
    }
}

pub fn command_bindings() -> Vec<CommerceTauriCommandBinding> {
    command_operation_ids()
        .into_iter()
        .map(|(command, operation_id)| {
            let contract = resolve_operation_contract(operation_id)
                .expect("tauri command operation must bind to a runtime operation contract");
            CommerceTauriCommandBinding {
                command,
                operation_id,
                service_name: contract.service_name,
                execution_policy: contract.execution_policy.clone(),
                capability_name: contract.capability_name,
                requires_idempotency: contract.requires_idempotency(),
                requires_transaction: contract.requires_transaction(),
                response_envelope_name: COMMERCE_RUNTIME_OPERATION_ENVELOPE_NAME,
                runtime_input_binding_name: COMMERCE_RUNTIME_OPERATION_INPUT_NAME,
            }
        })
        .collect()
}

fn command_operation_ids() -> Vec<(&'static str, &'static str)> {
    vec![
        (
            "commerce_account_summary",
            "accounts.current.summary.retrieve",
        ),
        ("commerce_addresses_list", "addresses.list"),
        ("commerce_addresses_create", "addresses.create"),
        ("commerce_addresses_update", "addresses.update"),
        ("commerce_addresses_delete", "addresses.delete"),
        (
            "commerce_addresses_default_selection_create",
            "addresses.defaultSelection.create",
        ),
        ("commerce_cart_current_retrieve", "cart.current.retrieve"),
        ("commerce_cart_items_create", "cart.items.create"),
        ("commerce_cart_items_update", "cart.items.update"),
        ("commerce_cart_items_delete", "cart.items.delete"),
        (
            "commerce_catalog_categories_list",
            "catalog.categories.list",
        ),
        ("commerce_catalog_products_list", "catalog.products.list"),
        (
            "commerce_catalog_products_retrieve",
            "catalog.products.retrieve",
        ),
        ("commerce_catalog_skus_retrieve", "catalog.skus.retrieve"),
        (
            "commerce_checkout_sessions_create",
            "checkout.sessions.create",
        ),
        (
            "commerce_checkout_sessions_retrieve",
            "checkout.sessions.retrieve",
        ),
        (
            "commerce_checkout_sessions_quotes_create",
            "checkout.sessions.quotes.create",
        ),
        (
            "commerce_checkout_sessions_orders_create",
            "checkout.sessions.orders.create",
        ),
        (
            "commerce_promotions_user_coupons_list",
            "promotions.userCoupons.list",
        ),
        ("commerce_promotions_offers_list", "promotions.offers.list"),
        (
            "commerce_promotions_user_coupon_claims_create",
            "promotions.userCoupons.claims.create",
        ),
        (
            "commerce_promotions_codes_redemptions_create",
            "promotions.codes.redemptions.create",
        ),
        ("commerce_orders_list", "orders.list"),
        ("commerce_orders_retrieve", "orders.retrieve"),
        ("commerce_orders_events_list", "orders.events.list"),
        (
            "commerce_orders_cancellations_create",
            "orders.cancellations.create",
        ),
        ("commerce_payments_methods_list", "payments.methods.list"),
        (
            "commerce_payments_intents_create",
            "payments.intents.create",
        ),
        (
            "commerce_payments_intents_retrieve",
            "payments.intents.retrieve",
        ),
        (
            "commerce_payments_intents_attempts_create",
            "payments.intents.attempts.create",
        ),
        (
            "commerce_payments_attempts_retrieve",
            "payments.attempts.retrieve",
        ),
        ("commerce_refunds_list", "refunds.list"),
        ("commerce_refunds_create", "refunds.create"),
        ("commerce_refunds_retrieve", "refunds.retrieve"),
        ("commerce_fulfillments_list", "fulfillments.list"),
        ("commerce_fulfillments_retrieve", "fulfillments.retrieve"),
        ("commerce_shipments_retrieve", "shipments.retrieve"),
        (
            "commerce_recharges_packages_list",
            "recharges.packages.list",
        ),
        (
            "commerce_recharges_orders_create",
            "recharges.orders.create",
        ),
        (
            "commerce_recharges_orders_retrieve",
            "recharges.orders.retrieve",
        ),
        (
            "commerce_wallet_overview_retrieve",
            "wallet.overview.retrieve",
        ),
        ("commerce_wallet_accounts_list", "wallet.accounts.list"),
        (
            "commerce_wallet_ledger_entries_list",
            "wallet.ledgerEntries.list",
        ),
        (
            "commerce_wallet_ledger_entries_retrieve",
            "wallet.ledgerEntries.retrieve",
        ),
        ("commerce_wallet_tokens_retrieve", "wallet.tokens.retrieve"),
        (
            "commerce_wallet_exchange_rate_retrieve",
            "wallet.exchangeRate.retrieve",
        ),
        (
            "commerce_wallet_points_exchange_rules_list",
            "wallet.points.exchangeRules.list",
        ),
        (
            "commerce_memberships_current_retrieve",
            "memberships.current.retrieve",
        ),
        ("commerce_memberships_plans_list", "memberships.plans.list"),
        (
            "commerce_memberships_benefits_list",
            "memberships.benefits.list",
        ),
        (
            "commerce_memberships_current_status_retrieve",
            "memberships.current.status.retrieve",
        ),
        (
            "commerce_memberships_package_groups_list",
            "memberships.packageGroups.list",
        ),
        (
            "commerce_memberships_package_groups_retrieve",
            "memberships.packageGroups.retrieve",
        ),
        (
            "commerce_memberships_package_groups_packages_list",
            "memberships.packageGroups.packages.list",
        ),
        (
            "commerce_memberships_packages_list",
            "memberships.packages.list",
        ),
        (
            "commerce_memberships_packages_retrieve",
            "memberships.packages.retrieve",
        ),
        (
            "commerce_memberships_purchases_create",
            "memberships.purchases.create",
        ),
        (
            "commerce_memberships_purchases_renew",
            "memberships.purchases.renew",
        ),
        (
            "commerce_memberships_purchases_upgrade",
            "memberships.purchases.upgrade",
        ),
        (
            "commerce_memberships_points_balance_retrieve",
            "memberships.points.balance.retrieve",
        ),
        (
            "commerce_memberships_points_history_list",
            "memberships.points.history.list",
        ),
        (
            "commerce_memberships_points_daily_rewards_create",
            "memberships.points.dailyRewards.create",
        ),
        (
            "commerce_memberships_points_daily_rewards_status_retrieve",
            "memberships.points.dailyRewards.status.retrieve",
        ),
        (
            "commerce_memberships_privileges_usage_retrieve",
            "memberships.privileges.usage.retrieve",
        ),
        (
            "commerce_memberships_privileges_speed_ups_create",
            "memberships.privileges.speedUps.create",
        ),
        ("commerce_invoices_list", "invoices.list"),
        ("commerce_invoices_create", "invoices.create"),
        ("commerce_invoices_retrieve", "invoices.retrieve"),
    ]
}
