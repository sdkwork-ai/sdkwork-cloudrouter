use axum::routing::get;
use sdkwork_api_clawrouter_assembly as api_assembly;
use sdkwork_api_clawrouter_standalone_gateway::portal::{mount_portal_static, PortalStaticConfig};
use sdkwork_web_bootstrap::{service_router, ServiceRouterConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    sdkwork_web_bootstrap::init_tracing_from_env();
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(std::io::Error::other)?;
    sdkwork_claw_http::configure_http_metrics_for_runtime(
        env!("CARGO_PKG_NAME"),
        runtime_toml.as_ref(),
        Some("postgresql"),
    )
    .map_err(std::io::Error::other)?;
    let bind_address = std::env::var("SDKWORK_CLAWROUTER_APPLICATION_PUBLIC_INGRESS_BIND")
        .ok()
        .or_else(|| std::env::var("SDKWORK_CLAW_SERVER_BIND").ok())
        .or_else(|| {
            runtime_toml
                .as_ref()
                .and_then(|config| config.server.bind.clone())
        })
        .unwrap_or_else(|| "127.0.0.1:3900".to_owned());
    let assembly =
        api_assembly::assemble_api_router(api_assembly::ApiAssemblyContext::default()).await?;
    let portal = PortalStaticConfig::from_env_and_runtime(runtime_toml.as_ref())
        .map_err(std::io::Error::other)?;
    let mut readiness_checks = vec![assembly.readiness_check.clone()];
    if let Some(portal) = &portal {
        readiness_checks.push(portal.readiness_check());
    }
    let api_router = service_router(
        assembly.router,
        ServiceRouterConfig::default()
            .with_composite_readiness(readiness_checks)
            .skip_metrics(),
    )
    .route("/metrics", get(sdkwork_claw_http::metrics));
    let app = mount_portal_static(api_router, portal);
    let bind_address = bind_address.parse()?;
    println!("sdkwork-api-clawrouter-standalone-gateway listening on http://{bind_address}");
    sdkwork_web_bootstrap::serve(app, bind_address).await?;
    Ok(())
}
