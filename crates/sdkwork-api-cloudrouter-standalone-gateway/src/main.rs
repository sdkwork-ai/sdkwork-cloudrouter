use axum::routing::get;
use sdkwork_api_cloudrouter_assembly as api_assembly;
use sdkwork_api_cloudrouter_standalone_gateway::portal::{mount_portal_static, PortalStaticConfig};
use sdkwork_web_bootstrap::{service_router, ServiceRouterConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    sdkwork_web_bootstrap::init_tracing_from_env();
    let runtime_toml = sdkwork_cloudrouter_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(std::io::Error::other)?;
    sdkwork_cloudrouter_http::configure_http_metrics_for_runtime(
        env!("CARGO_PKG_NAME"),
        runtime_toml.as_ref(),
        Some("postgresql"),
    )
    .map_err(std::io::Error::other)?;
    let bind_address = std::env::var("SDKWORK_CLOUDROUTER_APPLICATION_PUBLIC_INGRESS_BIND")
        .ok()
        .or_else(|| std::env::var("SDKWORK_CLOUDROUTER_SERVER_BIND").ok())
        .or_else(|| {
            runtime_toml
                .as_ref()
                .and_then(|config| config.server.bind.clone())
        })
        .unwrap_or_else(|| "127.0.0.1:3905".to_owned());
    let assembly =
        api_assembly::assemble_api_router(api_assembly::ApiAssemblyContext::default()).await?;
    let mut portal = PortalStaticConfig::from_env_and_runtime(runtime_toml.as_ref())
        .map_err(std::io::Error::other)?;
    // Commercial license posture (docs/commercial/PRICING.md): community by
    // default, pro/enterprise/oem when a signed license key is configured.
    // The edition is reported in logs and injected into the portal runtime
    // environment so the UI can surface it.
    use sdkwork_cloudrouter_license::{LicenseStatus, Edition};
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
    let license_edition: Edition = license.edition();
    if let Some(portal) = &mut portal {
        portal.license_edition = Some(license_edition.as_str().to_owned());
    }
    // Bootstrap Access-Token for the portal login flow. Every packaged
    // deployment resolves it here: an explicit SDKWORK_ACCESS_TOKEN wins,
    // otherwise a signed tenant-bound token is issued (tenant signing key
    // ensured first, then a signed JWT persisted as an IAM session).
    if let Some(portal) = &mut portal {
        match sdkwork_api_cloudrouter_standalone_gateway::bootstrap_credential::resolve_bootstrap_access_token()
            .await
        {
            Ok(Some(token)) => portal.bootstrap_access_token = Some(token),
            Ok(None) => {}
            Err(error) => tracing::warn!(
                %error,
                "bootstrap access token issuance failed; portal falls back to a payload-only token",
            ),
        }
    }
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
    .route("/metrics", get(sdkwork_cloudrouter_http::metrics));
    let app = mount_portal_static(api_router, portal);
    let bind_address = bind_address.parse()?;
    println!("sdkwork-api-cloudrouter-standalone-gateway listening on http://{bind_address}");
    sdkwork_web_bootstrap::serve(app, bind_address).await?;
    Ok(())
}
