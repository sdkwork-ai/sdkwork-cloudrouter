#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    let bind_addr = sdkwork_claw_provider_adapter::bind_addr_from_env_or_toml(
        runtime_toml
            .as_ref()
            .and_then(|config| config.services.provider_adapter.bind.as_deref()),
    )?;
    sdkwork_claw_provider_adapter::serve(bind_addr.as_str()).await
}
