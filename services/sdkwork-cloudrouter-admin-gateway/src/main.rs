fn main() -> anyhow::Result<()> {
    // Windows main-thread stacks default to 1 MiB. The all-in-one assembly
    // chain (in-process upstreams + dependency assemblies + web framework)
    // polls a deep async future graph on the block_on thread, so run the
    // gateway on a dedicated thread with a larger stack.
    std::thread::Builder::new()
        .name("cloudrouter-admin-api-gateway-main".to_owned())
        .stack_size(16 * 1024 * 1024)
        .spawn(gateway_main)
        .map_err(|error| anyhow::anyhow!("spawn gateway main thread: {error}"))?
        .join()
        .map_err(|_| anyhow::anyhow!("gateway main thread panicked"))?
}

#[tokio::main]
async fn gateway_main() -> anyhow::Result<()> {
    sdkwork_database_sqlx::enable_process_shared_database_pool();
    let runtime_toml = sdkwork_cloudrouter_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    let config = sdkwork_cloudrouter_config::RuntimeConfig::from_optional_parts(
        sdkwork_cloudrouter_admin_gateway::SERVICE_NAME,
        "SDKWORK_CLOUDROUTER_ADMIN_API_BIND",
        "0.0.0.0:18081",
        std::env::var("SDKWORK_CLOUDROUTER_ADMIN_API_BIND")
            .ok()
            .or_else(|| {
                runtime_toml
                    .as_ref()
                    .and_then(|config| config.services.admin_api.bind.clone())
            }),
        std::env::var(sdkwork_cloudrouter_config::DeploymentMode::ENV_DEPLOYMENT_MODE)
            .ok()
            .or_else(|| {
                runtime_toml
                    .as_ref()
                    .and_then(|config| config.runtime.deployment_mode.clone())
            }),
    )
    .map_err(anyhow::Error::msg)?;
    sdkwork_cloudrouter_admin_gateway::serve_with_runtime_config(
        config.bind_addr(),
        runtime_toml.as_ref(),
    )
    .await
}
