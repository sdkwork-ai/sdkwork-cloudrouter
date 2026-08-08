#[tokio::main]
async fn main() -> anyhow::Result<()> {
    sdkwork_database_sqlx::enable_process_shared_database_pool();
    let runtime_toml = sdkwork_cloudrouter_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    let config = runtime_config_from_env_or_toml(
        sdkwork_cloudrouter_edge_runtime::SERVICE_NAME,
        "SDKWORK_CLOUDROUTER_GATEWAY_BIND",
        "0.0.0.0:18080",
        runtime_toml
            .as_ref()
            .and_then(|config| config.services.gateway.bind.clone()),
        runtime_toml
            .as_ref()
            .and_then(|config| config.runtime.deployment_mode.clone()),
    )
    .map_err(anyhow::Error::msg)?;
    if sdkwork_cloudrouter_edge_runtime::edge_server_enabled(runtime_toml.as_ref())
        .map_err(anyhow::Error::msg)?
    {
        let mut edge_config =
            sdkwork_cloudrouter_edge_runtime::edge_server_config_from_env_or_runtime_toml(
                runtime_toml.as_ref(),
            )
            .map_err(anyhow::Error::msg)?;
        // Bootstrap Access-Token for the portal login flow: an explicit
        // SDKWORK_ACCESS_TOKEN wins, otherwise a signed tenant-bound token is
        // issued (tenant signing key ensured first, then a signed JWT
        // persisted as an IAM session).
        match sdkwork_iam_web_adapter::resolve_deployment_bootstrap_access_token(None, None).await
        {
            Ok(Some(token)) => {
                edge_config = edge_config.with_portal_bootstrap_access_token(Some(token));
            }
            Ok(None) => {}
            Err(error) => tracing::warn!(
                %error,
                "bootstrap access token issuance failed; portal falls back to a payload-only token",
            ),
        }
        // Commercial license posture (docs/commercial/PRICING.md).
        use sdkwork_cloudrouter_license::LicenseStatus;
        let license = sdkwork_cloudrouter_license::resolve_license();
        match &license {
            LicenseStatus::Licensed { info } => tracing::info!(
                tier = %info.tier,
                customer = %info.customer,
                expires_at = ?info.expires_at,
                "cloud router licensed edition",
            ),
            LicenseStatus::Unlicensed => tracing::info!(
                "cloud router community edition (no license key configured; see docs/commercial/LICENSING.md)",
            ),
            LicenseStatus::Invalid { reason } => tracing::warn!(
                %reason,
                "cloud router license is invalid or expired; running community edition",
            ),
        }
        edge_config = edge_config.with_portal_license_edition(
            Some(license.edition().as_str().to_owned()),
        );
        sdkwork_cloudrouter_edge_runtime::serve_edge_server_with_runtime_config(
            config.bind_addr(),
            edge_config,
            runtime_toml.as_ref(),
        )
        .await
    } else {
        sdkwork_cloudrouter_edge_runtime::serve_with_runtime_config(
            config.bind_addr(),
            runtime_toml.as_ref(),
        )
        .await
    }
}

fn runtime_config_from_env_or_toml(
    service_name: impl Into<String>,
    bind_env_name: impl Into<String>,
    default_bind_addr: impl Into<String>,
    config_bind_addr: Option<String>,
    config_deployment_mode: Option<String>,
) -> Result<sdkwork_cloudrouter_config::RuntimeConfig, String> {
    let bind_env_name = bind_env_name.into();
    sdkwork_cloudrouter_config::RuntimeConfig::from_optional_parts(
        service_name,
        bind_env_name.as_str(),
        default_bind_addr,
        std::env::var(&bind_env_name).ok().or(config_bind_addr),
        std::env::var(sdkwork_cloudrouter_config::DeploymentMode::ENV_DEPLOYMENT_MODE)
            .ok()
            .or(config_deployment_mode),
    )
}
