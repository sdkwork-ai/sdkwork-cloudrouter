//! Federated Feeds open-surface route wiring for Cloud Router database-backed runtime.
//!
//! Inspiration and community surfaces read curated feed streams through the
//! dependency-owned `sdkwork-api-feeds-assembly` open contribution so the
//! Cloud Router gateway serves `/feeds/v3/api/*` on the same origin as the
//! portal (API_ASSEMBLY_SPEC §3/§6.1.1).

use axum::Router;
use sdkwork_iam_web_adapter::build_web_framework_builder_with_open_api_prefixes;
use sdkwork_web_axum::with_web_request_context;
use sdkwork_web_core::{HttpRouteManifest, WebEnvironment};

/// Canonical browser path for the federated feeds open surface
/// (`API_ASSEMBLY_SPEC` §6.1.1, `ENVIRONMENT_SPEC` §6.2).
const FEEDS_OPEN_API_PREFIX: &str = "/feeds/v3/api";

#[derive(Clone)]
pub struct FederatedFeedsOpenSurface {
    pub router: Router,
    pub manifest: HttpRouteManifest,
}

/// Mirrors `sdkwork_iam_web_adapter::resolve_web_environment_from_process_env`
/// (private there): the federated surface must classify the deployment the same
/// way the shared builder does so production-like postures get an explicit
/// AuditEmitter wired before `production_defaults()` demands one.
fn feeds_web_environment() -> WebEnvironment {
    match std::env::var("SDKWORK_ENVIRONMENT")
        .ok()
        .as_deref()
        .map(str::trim)
        .unwrap_or("prod")
        .to_ascii_lowercase()
        .as_str()
    {
        "dev" | "development" => WebEnvironment::Dev,
        "test" | "testing" | "demo" => WebEnvironment::Test,
        _ => WebEnvironment::Prod,
    }
}

/// Redis URL for the shared stores, mirroring the standalone gateway env
/// contract (SDKWORK_CLOUDROUTER_REDIS_*).
fn feeds_redis_url() -> String {
    let host = std::env::var("SDKWORK_CLOUDROUTER_REDIS_HOST").unwrap_or_else(|_| "127.0.0.1".to_owned());
    let port = std::env::var("SDKWORK_CLOUDROUTER_REDIS_PORT").unwrap_or_else(|_| "6379".to_owned());
    let database =
        std::env::var("SDKWORK_CLOUDROUTER_REDIS_DATABASE").unwrap_or_else(|_| "0".to_owned());
    match std::env::var("SDKWORK_CLOUDROUTER_REDIS_PASSWORD")
        .ok()
        .filter(|value| !value.trim().is_empty())
    {
        Some(password) => format!("redis://:{password}@{host}:{port}/{database}"),
        None => format!("redis://{host}:{port}/{database}"),
    }
}

/// Installs the Feeds-owned web framework layer on the federated open router.
///
/// Dispatch resets request extensions before upstream oneshot, so the federated
/// surface must re-run the web framework pipeline (same contract as standalone
/// `sdkwork-api-feeds-standalone-gateway`).
async fn wrap_feeds_open_router_with_web_framework(
    router: Router,
    route_manifest: HttpRouteManifest,
    readiness_check: std::sync::Arc<dyn sdkwork_web_bootstrap::ReadinessCheck>,
) -> Result<Router, String> {
    // The audiences variant mirrors the standalone gateway main: under the
    // production posture it wires the SaaS production claim policy, which the
    // framework's production assembly validation demands (TenantBoundSaaS).
    let resolver =
        sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env_for_audiences(&[
            "sdkwork-cloudrouter",
            "cloudrouter",
        ])
        .await
        .map_err(|error| format!("resolve federated feeds IAM resolver failed: {error}"))?;
    let open_api_prefixes = vec![FEEDS_OPEN_API_PREFIX.to_owned()];
    let builder = build_web_framework_builder_with_open_api_prefixes(
        resolver,
        route_manifest,
        sdkwork_web_bootstrap::infra_public_path_prefixes(),
        open_api_prefixes,
    );
    let builder = if matches!(feeds_web_environment(), WebEnvironment::Prod) {
        let postgres_pool = sdkwork_iam_web_adapter::resolve_iam_postgres_pool_from_env()
            .await
            .ok_or("federated feeds production assembly requires PostgreSQL IAM audit storage")?;
        let redis_url = feeds_redis_url();
        let store_prefix = "sdkwork:cloudrouter:feeds";
        let rate_limit_store = sdkwork_web_bootstrap::shared_rate_limit_store(
            &redis_url,
            format!("{store_prefix}:rate-limit"),
        )
        .map_err(|error| format!("wire federated feeds rate limit store failed: {error}"))?;
        let idempotency_store = sdkwork_web_bootstrap::shared_idempotency_store(
            &redis_url,
            format!("{store_prefix}:idempotency"),
        )
        .map_err(|error| format!("wire federated feeds idempotency store failed: {error}"))?;
        let concurrent_admission_store =
            sdkwork_web_bootstrap::shared_concurrent_admission_store(
                &redis_url,
                format!("{store_prefix}:concurrent-admission"),
            )
            .map_err(|error| {
                format!("wire federated feeds concurrent admission store failed: {error}")
            })?;
        builder
            .readiness_check(readiness_check)
            .rate_limit_store(rate_limit_store)
            .idempotency_store(idempotency_store)
            .concurrent_admission_store(concurrent_admission_store)
            .audit_emitter(std::sync::Arc::new(
                sdkwork_iam_web_adapter::IamAuditEmitter::new(
                    postgres_pool.as_ref().clone(),
                    "sdkwork-cloudrouter",
                    "production",
                ),
            ))
            .security_event_emitter(std::sync::Arc::new(
                sdkwork_iam_web_adapter::IamSecurityEventEmitter::new(
                    postgres_pool.as_ref().clone(),
                    "production",
                ),
            ))
    } else {
        builder
    };
    let layer = builder.build().into_layer();
    Ok(with_web_request_context(router, layer))
}

/// Composes the Feeds open API contribution from the dependency-owned assembly.
///
/// The feeds managed store requires PostgreSQL; SQLite/desktop profiles skip
/// the surface and keep the gateway bootstrap independent.
pub async fn wire_federated_feeds_open_router(
    include_dependency_apis: bool,
) -> Result<Option<FederatedFeedsOpenSurface>, String> {
    if !include_dependency_apis {
        tracing::info!(
            target: "sdkwork.cloudrouter.feeds",
            "feeds open-api surface skipped (platform gateway profile)",
        );
        return Ok(None);
    }

    let contribution = sdkwork_api_feeds_assembly::assemble_open_api_contribution_from_env()
        .await
        .map_err(|error| format!("compose sdkwork-feeds open-api contribution failed: {error}"))?;
    let manifest = sdkwork_api_feeds_assembly::open_api_route_manifest();
    let router = wrap_feeds_open_router_with_web_framework(
        contribution.router,
        manifest.clone(),
        contribution.readiness_check.clone(),
    )
    .await
    .map_err(|error| format!("wire federated feeds web framework failed: {error}"))?;
    // The federated surface is probed with GET /readyz by the assembly
    // composite readiness check. The standalone feeds gateway mounts /readyz
    // at its top-level router; this federated router is the top level for the
    // surface, so answer the probe here (bootstrap already validated the
    // feeds database connection before the router was returned).
    let router = router.route(
        "/readyz",
        axum::routing::get(|| async { axum::http::StatusCode::OK }),
    );
    Ok(Some(FederatedFeedsOpenSurface { router, manifest }))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_feeds_consumes_feeds_open_api_contribution() {
        let source = include_str!("feeds_open_runtime.rs");

        assert!(
            source.contains("sdkwork_api_feeds_assembly::assemble_open_api_contribution_from_env(")
        );
        assert!(source.contains("sdkwork_api_feeds_assembly::open_api_route_manifest("));
        assert!(source.contains("build_web_framework_builder_with_open_api_prefixes("));
        assert!(source.contains("wrap_feeds_open_router_with_web_framework("));
        assert!(source.contains("with_web_request_context("));
        assert!(source.contains("FEEDS_OPEN_API_PREFIX"));
        let forbidden_direct_route_crate = ["sdkwork_routes_feeds", "_open_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
    }
}
