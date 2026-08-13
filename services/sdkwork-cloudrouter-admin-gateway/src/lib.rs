//! Thin standalone gateway for the Cloud Router backend-api plane
//! (distributed profile).
//!
//! Consumes only the canonical API assembly (API_ASSEMBLY_SPEC §6.1); route,
//! service, repository, and database wiring stays inside the assembly. The
//! canonical standalone gateway is `sdkwork-api-cloudrouter-standalone-gateway`.

#![forbid(unsafe_code)]

use axum::routing::get;

pub const SERVICE_NAME: &str = "sdkwork-cloudrouter-admin-gateway";

/// Database-free backend-plane router (health checks, smoke tests).
pub fn router() -> axum::Router {
    sdkwork_api_cloudrouter_assembly::lightweight_backend_router()
}

/// Serve the backend-api plane through the canonical API assembly on the
/// process-shared database pool.
pub async fn serve_with_runtime_config(
    bind_addr: &str,
    runtime_toml: Option<&sdkwork_cloudrouter_config::RuntimeTomlConfig>,
) -> anyhow::Result<()> {
    sdkwork_cloudrouter_http::configure_http_metrics_for_runtime(
        SERVICE_NAME,
        runtime_toml,
        Some("postgresql"),
    )
    .map_err(anyhow::Error::msg)?;
    sdkwork_cloudrouter_observability::init_tracing_with_runtime_config(
        runtime_toml.map(|config| &config.observability),
    )
    .map_err(anyhow::Error::msg)?;
    let assembly = sdkwork_api_cloudrouter_assembly::assemble_api_router(
        sdkwork_api_cloudrouter_assembly::ApiAssemblyContext::default(),
    )
    .await?;
    let api_router = sdkwork_web_bootstrap::service_router(
        assembly.router,
        sdkwork_web_bootstrap::ServiceRouterConfig::default()
            .with_composite_readiness(vec![assembly.readiness_check.clone()])
            .skip_metrics(),
    )
    .route("/metrics", get(sdkwork_cloudrouter_http::metrics));
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    sdkwork_cloudrouter_http::serve_with_graceful_shutdown_deadline(
        listener,
        api_router,
        sdkwork_cloudrouter_http::DEFAULT_GRACEFUL_SHUTDOWN_DEADLINE,
    )
    .await?;
    Ok(())
}
