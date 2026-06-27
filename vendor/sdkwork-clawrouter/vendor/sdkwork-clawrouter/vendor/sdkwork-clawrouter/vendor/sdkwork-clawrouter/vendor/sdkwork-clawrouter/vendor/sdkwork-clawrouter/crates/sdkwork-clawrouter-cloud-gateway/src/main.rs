#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    let config = runtime_config_from_env_or_toml(
        sdkwork_clawrouter_cloud_gateway::SERVICE_NAME,
        "SDKWORK_CLAW_GATEWAY_BIND",
        "0.0.0.0:18080",
        runtime_toml
            .as_ref()
            .and_then(|config| config.services.gateway.bind.clone()),
        runtime_toml
            .as_ref()
            .and_then(|config| config.runtime.deployment_mode.clone()),
    )
    .map_err(anyhow::Error::msg)?;
    sdkwork_clawrouter_cloud_gateway::serve_with_runtime_config(
        config.bind_addr(),
        runtime_toml.as_ref(),
    )
    .await
}

fn runtime_config_from_env_or_toml(
    service_name: impl Into<String>,
    bind_env_name: impl Into<String>,
    default_bind_addr: impl Into<String>,
    config_bind_addr: Option<String>,
    config_deployment_mode: Option<String>,
) -> Result<sdkwork_claw_config::RuntimeConfig, String> {
    let bind_env_name = bind_env_name.into();
    sdkwork_claw_config::RuntimeConfig::from_optional_parts(
        service_name,
        bind_env_name.as_str(),
        default_bind_addr,
        std::env::var(&bind_env_name).ok().or(config_bind_addr),
        std::env::var(sdkwork_claw_config::DeploymentMode::ENV_DEPLOYMENT_MODE)
            .ok()
            .or(config_deployment_mode),
    )
}
