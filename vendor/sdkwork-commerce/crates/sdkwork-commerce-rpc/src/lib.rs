use sdkwork_rpc_core::{SdkworkRpcMethod, SdkworkRpcServiceManifest};

pub const COMMERCE_RPC_PROTO_ROOT: &str =
    "packages/common/commerce/sdkwork-commerce-rpc-contracts/proto";

pub const COMMERCE_RPC_SERVICE_BINDING_CAPABILITY: &str = "commerce.rpc.service-binding";
pub const COMMERCE_RPC_CONTEXT_CAPABILITY: &str = "commerce.rpc.context";
pub const COMMERCE_RPC_ERROR_MAPPING_CAPABILITY: &str = "commerce.rpc.error-mapping";
pub const COMMERCE_RPC_SERVER_CAPABILITY: &str = "commerce.rpc.server";
pub const COMMERCE_RPC_HEALTH_CAPABILITY: &str = "commerce.rpc.health";
pub const COMMERCE_RPC_REFLECTION_CAPABILITY: &str = "commerce.rpc.reflection";

#[cfg(feature = "server")]
pub mod app;
#[cfg(feature = "server")]
pub mod backend;
#[cfg(feature = "server")]
pub mod context_mapper;
#[cfg(feature = "server")]
pub mod error_mapper;
#[cfg(feature = "server")]
pub mod interceptor;
#[cfg(feature = "server")]
pub mod request_mapper;
#[cfg(feature = "server")]
pub mod response_mapper;
#[cfg(feature = "server")]
pub mod runtime;
#[cfg(feature = "server")]
pub mod server;

#[cfg(feature = "server")]
pub use context_mapper::{
    commerce_runtime_context_from_iam, commerce_surface_profile_for_operation,
    resolve_rpc_auth_policy, CommerceRpcContextResolver, FixedCommerceRpcContextResolver,
};
#[cfg(feature = "server")]
pub use runtime::{
    extract_request_metadata, CommerceRpcNoopRuntime, CommerceRpcOperationRuntime,
    CommerceRpcRequestMetadata, ValidatedCommerceRpcRuntime,
};
#[cfg(feature = "server")]
pub use server::{
    commerce_rpc_server_builder, mark_commerce_rpc_health_serving, serve_commerce_rpc_server,
    CommerceRpcServerBuilder, CommerceRpcServerConfig, CommerceRpcServerHandle,
    CommerceRpcServices,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRpcAdapterManifest {
    pub service_manifests: Vec<SdkworkRpcServiceManifest>,
    pub proto_root: &'static str,
    pub capabilities: Vec<&'static str>,
}

pub fn commerce_rpc_adapter_manifest() -> CommerceRpcAdapterManifest {
    CommerceRpcAdapterManifest {
        service_manifests: all_commerce_rpc_service_manifests(),
        proto_root: COMMERCE_RPC_PROTO_ROOT,
        capabilities: vec![
            COMMERCE_RPC_SERVICE_BINDING_CAPABILITY,
            COMMERCE_RPC_CONTEXT_CAPABILITY,
            COMMERCE_RPC_ERROR_MAPPING_CAPABILITY,
            COMMERCE_RPC_SERVER_CAPABILITY,
            COMMERCE_RPC_HEALTH_CAPABILITY,
            COMMERCE_RPC_REFLECTION_CAPABILITY,
        ],
    }
}

pub fn commerce_rpc_service_manifest() -> CommerceRpcAdapterManifest {
    commerce_rpc_adapter_manifest()
}

pub fn commerce_app_rpc_service_manifests() -> Vec<SdkworkRpcServiceManifest> {
    vec![
        SdkworkRpcServiceManifest::new(
            "sdkwork.commerce.app.v3",
            "WalletService",
            "app",
            "commerce",
            vec![
                SdkworkRpcMethod::new(
                    "RetrieveWalletOverview",
                    "wallet.overview.retrieve",
                    "dual_token",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListWalletAccounts",
                    "wallet.accounts.list",
                    "dual_token",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListWalletLedgerEntries",
                    "wallet.ledgerEntries.list",
                    "dual_token",
                    false,
                ),
            ],
        ),
        SdkworkRpcServiceManifest::new(
            "sdkwork.commerce.app.v3",
            "CheckoutService",
            "app",
            "commerce",
            vec![
                SdkworkRpcMethod::new(
                    "CreateCheckoutSession",
                    "checkout.sessions.create",
                    "dual_token",
                    true,
                ),
                SdkworkRpcMethod::new(
                    "RetrieveCheckoutSession",
                    "checkout.sessions.retrieve",
                    "dual_token",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "CreateCheckoutQuote",
                    "checkout.sessions.quotes.create",
                    "dual_token",
                    true,
                ),
                SdkworkRpcMethod::new(
                    "CreateCheckoutOrder",
                    "checkout.sessions.orders.create",
                    "dual_token",
                    true,
                ),
            ],
        ),
    ]
}

pub fn commerce_backend_rpc_service_manifests() -> Vec<SdkworkRpcServiceManifest> {
    vec![
        SdkworkRpcServiceManifest::new(
            "sdkwork.commerce.backend.v3",
            "PaymentAdminService",
            "backend",
            "commerce",
            vec![
                SdkworkRpcMethod::new(
                    "ListPaymentProviderAccounts",
                    "payments.providerAccounts.list",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "CreatePaymentProviderAccount",
                    "payments.providerAccounts.create",
                    "backend_admin",
                    true,
                ),
                SdkworkRpcMethod::new(
                    "ListPaymentMethods",
                    "payments.methods.management.list",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListPaymentChannels",
                    "payments.channels.list",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListPaymentIntents",
                    "payments.intents.list",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListPaymentAttempts",
                    "payments.attempts.list",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListPaymentReconciliationRuns",
                    "payments.reconciliationRuns.list",
                    "backend_admin",
                    false,
                ),
            ],
        ),
        SdkworkRpcServiceManifest::new(
            "sdkwork.commerce.backend.v3",
            "CommerceReportService",
            "backend",
            "commerce",
            vec![
                SdkworkRpcMethod::new(
                    "ListUsageStatements",
                    "commerceReports.usageStatements.list",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "RetrievePaymentReconciliation",
                    "commerceReports.paymentReconciliation.retrieve",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListOrderRevenue",
                    "commerceReports.orderRevenue.list",
                    "backend_admin",
                    false,
                ),
                SdkworkRpcMethod::new(
                    "ListRefundReports",
                    "commerceReports.refunds.list",
                    "backend_admin",
                    false,
                ),
            ],
        ),
    ]
}

pub fn all_commerce_rpc_service_manifests() -> Vec<SdkworkRpcServiceManifest> {
    let mut manifests = commerce_app_rpc_service_manifests();
    manifests.extend(commerce_backend_rpc_service_manifests());
    manifests
}
