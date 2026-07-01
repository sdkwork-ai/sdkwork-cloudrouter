//! Embedded IAM dependency routers for sdkwork-api-cloud-gateway (APPLICATION_GATEWAY_SPEC §5.7.2).
//! IAM app and backend surfaces mount only through the gateway layer, not on product routers.

use std::path::PathBuf;

use axum::Router;
use sdkwork_iam_embedded_application_bootstrap::{
    ensure_tenant_application_from_app_root_with_env_and_fallback,
    resolve_application_app_root, resolve_bootstrap_environment,
};

use crate::runtime::GatewayRouterError;

pub async fn ensure_clawrouter_embedded_iam_bootstrap() -> Result<(), GatewayRouterError> {
    let app_root = resolve_clawrouter_app_root();
    sdkwork_iam_database_host::unified_postgres_env::apply_unified_claw_postgres_env(&app_root);
    sdkwork_iam_database_host::bootstrap_iam_database_from_env()
        .await
        .map_err(|error| {
            GatewayRouterError::Config(format!(
                "failed to bootstrap IAM database lifecycle: {error}"
            ))
        })?;
    ensure_tenant_application_from_app_root_with_env_and_fallback(
        resolve_bootstrap_environment().as_str(),
        app_root,
        None,
        &[],
    )
    .await
    .map_err(GatewayRouterError::Config)
}

pub async fn build_claw_embedded_iam_app_api_router() -> Result<Router, GatewayRouterError> {
    ensure_clawrouter_embedded_iam_bootstrap().await?;
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router_with_web_resolver(resolver)
        .await
        .map_err(|error| {
            GatewayRouterError::Config(format!(
                "failed to build embedded SDKWork IAM app API router: {error}"
            ))
        })
}

pub async fn build_claw_embedded_iam_backend_api_router() -> Result<Router, GatewayRouterError> {
    ensure_clawrouter_embedded_iam_bootstrap().await?;
    Ok(
        sdkwork_routes_iam_backend_api::build_sdkwork_iam_backend_api_router_from_env().await,
    )
}

fn resolve_clawrouter_app_root() -> PathBuf {
    resolve_application_app_root().unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../..")
            .canonicalize()
            .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
    })
}
