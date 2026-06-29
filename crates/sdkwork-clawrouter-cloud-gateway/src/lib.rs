pub mod edge_server;
mod gateway_api_key_auth;
mod invocation_dispatcher;
mod invocation_http;
mod invocation_provider_adapter;
mod invocation_router;
mod invocation_sticky_store;
mod openai_passthrough_routes;
mod passthrough;
mod provider_account_auth;
pub mod provider_adapter_transport;
mod provider_passthrough_transport;
mod request_identity;
pub mod runtime;

pub use edge_server::{
    all_in_one_edge_router_from_env, edge_server_router,
    edge_server_router_with_in_process_upstreams, serve,
    serve_all_in_one_edge_server_with_runtime_config, serve_edge_server,
    serve_edge_server_with_runtime_config, serve_with_runtime_config, EdgeInProcessUpstreams,
    EdgeServerConfig,
};
pub use invocation_dispatcher::InvocationHttpDispatcher;
pub use invocation_router::{
    invocation_policy_guard_from_runtime_toml_with_instance_count,
    invocation_router_with_catalog_api_key_hasher_and_dispatcher,
    invocation_router_with_catalog_api_key_hasher_dispatcher_and_secret_resolver,
    invocation_router_with_catalog_api_key_hasher_dispatcher_secret_resolver_and_sticky_store,
    invocation_router_with_full_pipeline,
    invocation_router_with_full_pipeline_and_provider_adapter_config,
    invocation_router_with_full_pipeline_and_trust_forwarded_headers,
    invocation_router_with_full_pipeline_provider_adapter_and_tenant_inflight,
};
#[rustfmt::skip]
pub use openai_passthrough_routes::{openai_compatible_passthrough_paths, openai_method_passthrough_paths, stored_chat_completion_passthrough_paths};
#[rustfmt::skip]
pub use passthrough::{authenticated_provider_native_passthrough_router_with_adapter_config, provider_native_passthrough_providers, router_with_provider_passthrough_and_adapter_config, router_with_provider_passthrough_config};
#[rustfmt::skip]
pub use runtime::{
    router_from_env, router_with_database_and_api_key_config,
    router_with_database_api_key_and_provider_configs,
    router_with_database_api_key_provider_configs_and_adapter_config,
    router_with_database_api_key_and_provider_relay_config,
    router_with_database_api_key_provider_configs_and_usage_settlement_worker_config,
    router_with_optional_database_api_key_and_provider_configs, router_with_optional_database_api_key_and_provider_relay_config,
    router_with_optional_database_config, router_with_product_catalog_and_api_key_hasher, router_with_product_catalog_api_key_hasher_and_chat_completion_relay,
    router_with_product_catalog_api_key_hasher_and_chat_completion_streaming_relay,
    router_with_product_catalog_api_key_hasher_and_embeddings_relay,
    router_with_product_catalog_api_key_hasher_and_responses_relay, GatewayRouterError,
};

pub const SERVICE_NAME: &str = "sdkwork-clawrouter-cloud-gateway";

pub fn router() -> axum::Router {
    router_with_database_status_and_passthrough_placeholder(None, true, None)
}

pub(crate) fn router_with_database_status_and_passthrough_placeholder(
    config: Option<&sdkwork_claw_config::DatabaseConfig>,
    include_passthrough_placeholder: bool,
    readiness_check: Option<sdkwork_claw_http::ReadinessCheckFn>,
) -> axum::Router {
    let router = sdkwork_claw_http::service_router_with_database_config_and_readiness_check(
        SERVICE_NAME,
        config,
        readiness_check,
    );
    if include_passthrough_placeholder {
        router.merge(passthrough::gateway_passthrough_router())
    } else {
        router
    }
}
