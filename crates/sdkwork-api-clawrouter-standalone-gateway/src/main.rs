use sdkwork_api_clawrouter_assembly as api_assembly;
use sdkwork_web_bootstrap::{service_router, ServiceRouterConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    sdkwork_web_bootstrap::init_tracing_from_env();
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(std::io::Error::other)?;
    let bind_address = std::env::var("SDKWORK_CLAWROUTER_APPLICATION_PUBLIC_INGRESS_BIND")
        .ok()
        .or_else(|| std::env::var("SDKWORK_CLAW_SERVER_BIND").ok())
        .or_else(|| runtime_toml.and_then(|config| config.server.bind))
        .unwrap_or_else(|| "127.0.0.1:3900".to_owned());
    let assembly =
        api_assembly::assemble_api_router(api_assembly::ApiAssemblyContext::default()).await?;
    let app = service_router(
        assembly.router,
        ServiceRouterConfig::default().with_always_ready(),
    );
    let bind_address = bind_address.parse()?;
    println!("sdkwork-api-clawrouter-standalone-gateway listening on http://{bind_address}");
    sdkwork_web_bootstrap::serve(app, bind_address).await?;
    Ok(())
}
