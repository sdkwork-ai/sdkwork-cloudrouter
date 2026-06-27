pub mod account_router;
pub mod after_sales_router;
pub mod app_merchant_inventory_router;
pub mod backend_inventory_router;
pub mod backend_order_admin_router;
pub mod backend_payment_admin_router;
pub mod backend_payment_intent_router;
pub mod backend_shop_admin_router;
pub mod billing_router;
pub mod catalog_router;
pub mod checkout_router;
pub mod fulfillment_router;
pub mod health_router;
pub mod invoice_router;
pub mod manifest_stub_router;
pub mod order_router;
pub mod payment_intent_router;
pub mod payment_router;
pub mod promotion_router;
pub mod recharge_router;
pub mod refund_router;
mod request_hash;
mod request_identity;
pub mod shipment_router;
pub mod shop_router;
pub mod test_http;
mod web_bootstrap;

pub mod route_manifest {
    include!(concat!(env!("OUT_DIR"), "/commerce_http_routes.rs"));
}

pub use route_manifest::{COMMERCE_APP_HTTP_ROUTES, COMMERCE_BACKEND_HTTP_ROUTES};
pub use web_bootstrap::{
    commerce_public_path_prefixes, with_commerce_app_request_context,
    with_commerce_backend_request_context, wrap_commerce_app_router_from_env,
    wrap_commerce_backend_router_from_env,
};

pub(crate) use request_identity::{with_backend_request_identity, with_request_identity};

pub use account_router::{
    app_account_wallet_router_with_postgres_pool, app_account_wallet_router_with_sqlite_pool,
    app_account_wallet_router_with_store, CommerceAccountWalletStore, CommerceWalletFuture,
};
pub use after_sales_router::{
    app_after_sales_router_with_postgres_pool, app_after_sales_router_with_sqlite_pool,
    app_after_sales_router_with_store, CommerceAfterSalesStore,
};
pub use app_merchant_inventory_router::{
    app_merchant_inventory_router_with_postgres_pool,
    app_merchant_inventory_router_with_sqlite_pool, app_merchant_inventory_router_with_store,
    CommerceMerchantInventoryStore,
};
pub use backend_inventory_router::{
    backend_inventory_router_with_postgres_pool, backend_inventory_router_with_sqlite_pool,
    backend_inventory_router_with_store, CommerceBackendInventoryStore,
};
pub use backend_order_admin_router::{
    backend_order_admin_router_with_postgres_pool, backend_order_admin_router_with_sqlite_pool,
};
pub use backend_payment_admin_router::{
    backend_payment_admin_router_with_postgres_pool, backend_payment_admin_router_with_sqlite_pool,
    backend_payment_admin_router_with_store, BackendPaymentMethodListQuery,
    CommerceBackendPaymentAdminStore,
};
pub use backend_payment_intent_router::{
    backend_payment_intent_router_with_postgres_pool,
    backend_payment_intent_router_with_sqlite_pool, backend_payment_intent_router_with_store,
    CommerceBackendPaymentIntentStore,
};
pub use backend_shop_admin_router::{
    backend_shop_admin_router_with_postgres_pool, backend_shop_admin_router_with_sqlite_pool,
};
pub use billing_router::{
    app_billing_history_router_with_postgres_pool, app_billing_history_router_with_sqlite_pool,
    app_billing_history_router_with_store, CommerceBillingHistoryFuture,
    CommerceBillingHistoryStore,
};
pub use catalog_router::{
    app_catalog_router_with_postgres_pool, app_catalog_router_with_sqlite_pool,
    app_catalog_router_with_store, backend_catalog_router_with_postgres_pool,
    backend_catalog_router_with_sqlite_pool, backend_catalog_router_with_store,
    CommerceCatalogFuture, CommerceCatalogStore,
};
pub use checkout_router::{
    app_checkout_router_with_postgres_pool, app_checkout_router_with_sqlite_pool,
    app_checkout_router_with_store, CommerceCheckoutStore,
};
pub use fulfillment_router::{
    app_fulfillment_router_with_postgres_pool, app_fulfillment_router_with_sqlite_pool,
    app_fulfillment_router_with_store, CommerceFulfillmentStore,
};
pub use health_router::{
    commerce_health_router, commerce_health_router_with_postgres_pool,
    commerce_health_router_with_sqlite_pool,
};
pub use invoice_router::{
    app_invoice_router_with_postgres_pool, app_invoice_router_with_sqlite_pool,
    app_invoice_router_with_store, CommerceInvoiceFuture, CommerceInvoiceStore,
};
pub use order_router::{
    app_order_router_with_postgres_pool, app_order_router_with_sqlite_pool,
    app_order_router_with_store, CommerceOrderStore,
};
pub use payment_intent_router::{
    app_payment_intent_router_with_postgres_pool, app_payment_intent_router_with_sqlite_pool,
    app_payment_intent_router_with_store, CommercePaymentIntentStore,
};
pub use payment_router::{
    app_payment_router_with_postgres_pool, app_payment_router_with_sqlite_pool,
    app_payment_router_with_store, CommercePaymentStore,
};
pub use promotion_router::{
    app_promotion_router_with_postgres_pool, app_promotion_router_with_sqlite_pool,
    app_promotion_router_with_store, CommercePromotionStore,
};
pub use recharge_router::{
    app_recharge_checkout_router_with_postgres_pool, app_recharge_checkout_router_with_sqlite_pool,
    app_recharge_checkout_router_with_store, CommerceRechargeCheckoutStore,
};
pub use refund_router::{
    app_refund_router_with_postgres_pool, app_refund_router_with_sqlite_pool,
    app_refund_router_with_store, CommerceRefundStore,
};
pub use shipment_router::{
    app_shipment_router_with_postgres_pool, app_shipment_router_with_sqlite_pool,
    app_shipment_router_with_store, CommerceShipmentStore,
};
pub use shop_router::{
    app_shop_router_with_postgres_pool, app_shop_router_with_sqlite_pool,
    app_shop_router_with_stores, CommerceShopStore,
};

use sdkwork_commerce_contract_service::OperationExecutionPolicy;
use sdkwork_commerce_service_host::resolve_operation_contract;

pub const APP_API_PREFIX: &str = "/app/v3/api";
pub const BACKEND_API_PREFIX: &str = "/backend/v3/api";

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum HttpMethod {
    Delete,
    Get,
    Patch,
    Post,
    Put,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceHttpRoute {
    pub method: HttpMethod,
    pub path: &'static str,
    pub tag: &'static str,
    pub operation_id: &'static str,
    pub response_envelope_name: &'static str,
    pub runtime_input_binding_name: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceHttpRouteExecutionMetadata {
    pub operation_id: &'static str,
    pub service_name: &'static str,
    pub execution_policy: OperationExecutionPolicy,
    pub capability_name: &'static str,
    pub requires_idempotency: bool,
    pub requires_transaction: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceHttpResponseEnvelope {
    pub name: &'static str,
    pub fields: Vec<&'static str>,
    pub error_fields: Vec<&'static str>,
    pub applies_to_app_routes: bool,
    pub applies_to_tauri_commands: bool,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeInputBinding {
    pub input_type: &'static str,
    pub operation_id_source: &'static str,
    pub body_json_source: &'static str,
    pub context_source: &'static str,
    pub capabilities_source: &'static str,
    pub idempotency_key_header: &'static str,
    pub request_hash_header: &'static str,
    pub required_context_fields: Vec<&'static str>,
    pub applies_to_app_routes: bool,
    pub applies_to_backend_routes: bool,
    pub applies_to_tauri_commands: bool,
}

impl CommerceHttpRoute {
    pub const fn new(
        method: HttpMethod,
        path: &'static str,
        tag: &'static str,
        operation_id: &'static str,
    ) -> Self {
        Self {
            method,
            path,
            tag,
            operation_id,
            response_envelope_name: COMMERCE_RUNTIME_OPERATION_ENVELOPE_NAME,
            runtime_input_binding_name: COMMERCE_RUNTIME_OPERATION_INPUT_NAME,
        }
    }
}

mod route_tables;

pub use route_tables::{app_routes, backend_routes};

pub fn all_routes() -> Vec<CommerceHttpRoute> {
    let mut routes = app_routes();
    routes.extend(backend_routes());
    routes
}

pub fn app_route_execution_metadata() -> Vec<CommerceHttpRouteExecutionMetadata> {
    app_routes()
        .into_iter()
        .map(|route| {
            let contract = resolve_operation_contract(route.operation_id)
                .expect("app route operation must bind to a runtime operation contract");
            CommerceHttpRouteExecutionMetadata {
                operation_id: route.operation_id,
                service_name: contract.service_name,
                execution_policy: contract.execution_policy.clone(),
                capability_name: contract.capability_name,
                requires_idempotency: contract.requires_idempotency(),
                requires_transaction: contract.requires_transaction(),
            }
        })
        .collect()
}

pub fn commerce_http_response_envelope() -> CommerceHttpResponseEnvelope {
    CommerceHttpResponseEnvelope {
        name: COMMERCE_RUNTIME_OPERATION_ENVELOPE_NAME,
        fields: vec![
            "ok",
            "operation_id",
            "service_name",
            "body_json",
            "outcome_kind",
            "idempotency_scope",
            "error",
        ],
        error_fields: vec!["code", "message"],
        applies_to_app_routes: true,
        applies_to_tauri_commands: true,
    }
}

pub fn commerce_http_runtime_input_binding() -> CommerceRuntimeInputBinding {
    runtime_input_binding(
        "request.authenticated_runtime_context",
        "request.body_json",
        true,
        false,
        false,
    )
}

pub fn commerce_tauri_runtime_input_binding() -> CommerceRuntimeInputBinding {
    runtime_input_binding(
        "tauri.authenticated_runtime_context",
        "command.payload_json",
        false,
        false,
        true,
    )
}

pub fn required_dual_token_headers() -> [&'static str; 2] {
    ["Authorization", "Access-Token"]
}

pub const COMMERCE_RUNTIME_OPERATION_ENVELOPE_NAME: &str = "CommerceRuntimeOperationEnvelope";
pub const COMMERCE_RUNTIME_OPERATION_INPUT_NAME: &str = "CommerceRuntimeOperationInput";

fn runtime_input_binding(
    context_source: &'static str,
    body_json_source: &'static str,
    applies_to_app_routes: bool,
    applies_to_backend_routes: bool,
    applies_to_tauri_commands: bool,
) -> CommerceRuntimeInputBinding {
    CommerceRuntimeInputBinding {
        input_type: COMMERCE_RUNTIME_OPERATION_INPUT_NAME,
        operation_id_source: "route.operation_id",
        body_json_source,
        context_source,
        capabilities_source: "runtime.capability_manifest",
        idempotency_key_header: "Idempotency-Key",
        request_hash_header: "Sdkwork-Request-Hash",
        required_context_fields: vec![
            "tenant_id",
            "organization_id",
            "user_id",
            "session_id",
            "app_id",
            "deployment_mode",
            "environment",
            "surface_profile",
        ],
        applies_to_app_routes,
        applies_to_backend_routes,
        applies_to_tauri_commands,
    }
}
