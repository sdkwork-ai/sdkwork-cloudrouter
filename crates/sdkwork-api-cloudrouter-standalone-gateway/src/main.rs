use std::sync::Arc;

use axum::routing::get;
use sdkwork_api_cloudrouter_standalone_gateway::portal::{mount_portal_static, PortalStaticConfig};
use sdkwork_cloudrouter_config::RedisConfig;
use sdkwork_cloudrouter_security::INTERNAL_GATEWAY_ROUTE_PREFIX;
use sdkwork_iam_web_adapter::{
    build_web_framework_builder_with_open_api_prefixes,
    iam_web_request_context_resolver_from_env_for_audiences, resolve_iam_postgres_pool_from_env,
    IamAuditEmitter, IamSecurityEventEmitter,
};
use sdkwork_web_bootstrap::{
    infra_public_path_prefixes, ApiModuleRegistry, ComposedApiAssembly, CompositeReadinessCheck,
};
use sdkwork_web_core::{WebEnvironment, WebRequestContextProfile};

const APPLICATION_ID: &str = "sdkwork-cloudrouter";
const OPEN_API_PREFIXES: &[&str] = &[
    "/v1",
    "/anthropic/v1",
    "/elevenlabs/v1",
    "/google/v1beta",
    "/kling/v1",
    "/midjourney/v1",
    "/nano-banana/v1",
    "/suno/v1",
    "/feeds/v3/api",
];

fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Windows main-thread stacks default to 1 MiB. The all-in-one assembly
    // chain (in-process upstreams + dependency assemblies + web framework)
    // polls a deep async future graph on the block_on thread, so run the
    // gateway on a dedicated thread with a larger stack.
    std::thread::Builder::new()
        .name("cloudrouter-gateway-main".to_owned())
        .stack_size(16 * 1024 * 1024)
        .spawn(gateway_main)
        .map_err(|error| std::io::Error::other(format!("spawn gateway main thread: {error}")))?
        .join()
        .map_err(|_| std::io::Error::other("gateway main thread panicked"))?
}

#[tokio::main]
async fn gateway_main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
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
    let assembly = sdkwork_api_cloudrouter_assembly::assemble_api_router(
        sdkwork_api_cloudrouter_assembly::ApiAssemblyContext::default(),
    )
    .await?;
    let mut portal = PortalStaticConfig::from_env_and_runtime(runtime_toml.as_ref())
        .map_err(std::io::Error::other)?;
    // Commercial license posture (docs/commercial/PRICING.md): community by
    // default, pro/enterprise/oem when a signed license key is configured.
    // The edition is reported in logs and injected into the portal runtime
    // environment so the UI can surface it.
    use sdkwork_cloudrouter_license::{Edition, LicenseStatus};
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
    // No bootstrap Access-Token is issued or injected for the portal runtime
    // script: distributing a signed or session-bound token through an
    // anonymously readable script would publish a live credential to every
    // visitor. Development workstations may opt in to a payload-only token
    // through SDKWORK_CLOUDROUTER_PORTAL_DEV_BOOTSTRAP_TOKEN on the edge server.
    let resolver =
        iam_web_request_context_resolver_from_env_for_audiences(&[APPLICATION_ID, "cloudrouter"])
            .await?;
    let environment = sdkwork_cloudrouter_http::resolve_cloud_web_environment_from_process_env();
    let open_api_prefixes = OPEN_API_PREFIXES
        .iter()
        .map(|prefix| (*prefix).to_owned())
        .collect::<Vec<_>>();
    // The IAM adapter helper already excludes open-api prefixes from the
    // gateway surface (gateway_api_prefixes_excluding). Rebuilding the profile
    // below must preserve that exclusion: `/v1` is an open-api prefix here,
    // and reclassifying it as gateway-api would reject the open-api route
    // manifest auth profiles at startup.
    let gateway_api_prefixes = WebRequestContextProfile::default()
        .gateway_api_prefixes
        .into_iter()
        .filter(|prefix| !open_api_prefixes.iter().any(|open| open == prefix))
        .collect::<Vec<_>>();
    // The internal gateway channel (`/internal/v3/gateway/*`) is signed and
    // verified by the invocation pipeline itself (HMAC + replay protection);
    // the web framework must treat it as a public path so its surface
    // classifier does not demand IAM credentials that the channel never
    // carries.
    let mut public_path_prefixes = infra_public_path_prefixes();
    public_path_prefixes.push(INTERNAL_GATEWAY_ROUTE_PREFIX.to_owned());
    let mut framework = build_web_framework_builder_with_open_api_prefixes(
        resolver,
        assembly.route_manifest.clone(),
        public_path_prefixes.clone(),
        open_api_prefixes.clone(),
    )
    .profile(WebRequestContextProfile {
        open_api_prefixes,
        public_path_prefixes,
        gateway_api_prefixes,
        environment: environment.clone(),
        ..WebRequestContextProfile::default()
    })
    .security_policy(sdkwork_cloudrouter_http::cloud_service_security_policy(
        &environment,
    ))
    .metrics_registry(sdkwork_cloudrouter_http::shared_http_metrics_registry())
    .skip_infra_metrics();
    if matches!(environment, WebEnvironment::Prod) {
        let redis = RedisConfig::from_env_or_runtime_toml(runtime_toml.as_ref())?
            .ok_or("production CloudRouter gateway requires Redis")?;
        let postgres_pool = resolve_iam_postgres_pool_from_env()
            .await
            .ok_or("production CloudRouter gateway requires PostgreSQL IAM audit storage")?;
        let store_prefix = "sdkwork:cloudrouter:web";
        framework = framework
            .production_defaults()
            .rate_limit_store(sdkwork_web_bootstrap::shared_rate_limit_store(
                redis.url(),
                format!("{store_prefix}:rate-limit"),
            )?)
            .idempotency_store(sdkwork_web_bootstrap::shared_idempotency_store(
                redis.url(),
                format!("{store_prefix}:idempotency"),
            )?)
            .concurrent_admission_store(sdkwork_web_bootstrap::shared_concurrent_admission_store(
                redis.url(),
                format!("{store_prefix}:concurrent-admission"),
            )?)
            .audit_emitter(Arc::new(IamAuditEmitter::new(
                postgres_pool.as_ref().clone(),
                APPLICATION_ID,
                "production",
            )))
            .security_event_emitter(Arc::new(IamSecurityEventEmitter::new(
                postgres_pool.as_ref().clone(),
                "production",
            )));
    }
    let mut module_registry = ApiModuleRegistry::new();
    module_registry.add_modules(vec![assembly]);
    let mut composed = module_registry.try_compose("SDKWork Cloud Router API")?;
    let mut readiness_checks = vec![composed.readiness_check.clone()];
    if let Some(portal) = &portal {
        readiness_checks.push(portal.readiness_check());
    }
    composed.readiness_check = Arc::new(CompositeReadinessCheck::new(readiness_checks));
    let api_router = composed
        .into_hosted(framework)
        .router
        .route("/metrics", get(sdkwork_cloudrouter_http::metrics));
    let app = mount_portal_static(api_router, portal);
    let bind_address = bind_address.parse()?;
    println!("sdkwork-api-cloudrouter-standalone-gateway listening on http://{bind_address}");
    sdkwork_web_bootstrap::serve(app, bind_address).await?;
    Ok(())
}
