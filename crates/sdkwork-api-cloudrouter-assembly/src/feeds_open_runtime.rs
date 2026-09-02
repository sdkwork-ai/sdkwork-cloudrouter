//! Federated Feeds open-surface route wiring for Cloud Router database-backed runtime.
//!
//! Inspiration and community surfaces read curated feed streams through the
//! dependency-owned `sdkwork-api-feeds-assembly` open contribution so the
//! Cloud Router gateway serves `/feeds/v3/api/*` on the same origin as the
//! portal (API_ASSEMBLY_SPEC §3/§6.1.1).

use axum::Router;
use sdkwork_iam_web_adapter::build_web_framework_builder_with_open_api_prefixes;
use sdkwork_web_axum::with_web_request_context;
use sdkwork_web_core::HttpRouteManifest;

/// Canonical browser path for the federated feeds open surface
/// (`API_ASSEMBLY_SPEC` §6.1.1, `ENVIRONMENT_SPEC` §6.2).
const FEEDS_OPEN_API_PREFIX: &str = "/feeds/v3/api";

#[derive(Clone)]
pub struct FederatedFeedsOpenSurface {
    pub router: Router,
    pub manifest: HttpRouteManifest,
}

/// Installs the Feeds-owned web framework layer on the federated open router.
///
/// Dispatch resets request extensions before upstream oneshot, so the federated
/// surface must re-run the web framework pipeline (same contract as standalone
/// `sdkwork-api-feeds-standalone-gateway`).
async fn wrap_feeds_open_router_with_web_framework(
    router: Router,
    route_manifest: HttpRouteManifest,
) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    let open_api_prefixes = vec![FEEDS_OPEN_API_PREFIX.to_owned()];
    let layer = build_web_framework_builder_with_open_api_prefixes(
        resolver,
        route_manifest,
        sdkwork_web_bootstrap::infra_public_path_prefixes(),
        open_api_prefixes,
    )
    .build()
    .into_layer();
    with_web_request_context(router, layer)
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
    let router =
        wrap_feeds_open_router_with_web_framework(contribution.router, manifest.clone()).await;
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
