#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    let config = sdkwork_claw_config::RuntimeConfig::from_optional_parts(
        sdkwork_clawrouter_admin_api_server::SERVICE_NAME,
        "SDKWORK_CLAW_ADMIN_API_BIND",
        "0.0.0.0:18081",
        std::env::var("SDKWORK_CLAW_ADMIN_API_BIND")
            .ok()
            .or_else(|| {
                runtime_toml
                    .as_ref()
                    .and_then(|config| config.services.admin_api.bind.clone())
            }),
        std::env::var(sdkwork_claw_config::DeploymentMode::ENV_DEPLOYMENT_MODE)
            .ok()
            .or_else(|| {
                runtime_toml
                    .as_ref()
                    .and_then(|config| config.runtime.deployment_mode.clone())
            }),
    )
    .map_err(anyhow::Error::msg)?;
    sdkwork_clawrouter_admin_api_server::serve_with_runtime_config(
        config.bind_addr(),
        runtime_toml.as_ref(),
    )
    .await
}
