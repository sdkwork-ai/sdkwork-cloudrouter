#[tokio::main]
async fn main() -> anyhow::Result<()> {
    sdkwork_database_sqlx::enable_process_shared_database_pool();
    let runtime_toml = sdkwork_cloudrouter_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    let config = sdkwork_cloudrouter_config::RuntimeConfig::from_optional_parts(
        sdkwork_cloudrouter_standalone_gateway::SERVICE_NAME,
        "SDKWORK_CLOUDROUTER_APP_API_BIND",
        "0.0.0.0:18082",
        std::env::var("SDKWORK_CLOUDROUTER_APP_API_BIND")
            .ok()
            .or_else(|| {
                runtime_toml
                    .as_ref()
                    .and_then(|config| config.services.app_api.bind.clone())
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
    sdkwork_cloudrouter_standalone_gateway::serve_with_runtime_config(
        config.bind_addr(),
        runtime_toml.as_ref(),
    )
    .await
}
