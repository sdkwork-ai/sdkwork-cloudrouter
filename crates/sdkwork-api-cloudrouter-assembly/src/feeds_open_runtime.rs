//! Federated Feeds open-surface route wiring for Cloud Router database-backed runtime.
//!
//! Inspiration and community surfaces read curated feed streams through the
//! dependency-owned `sdkwork-api-feeds-assembly` open contribution so the
//! Cloud Router gateway serves `/feeds/v3/api/*` on the same origin as the
//! portal (API_ASSEMBLY_SPEC §3).

use axum::Router;
use sdkwork_web_core::HttpRouteManifest;

pub struct FederatedFeedsOpenSurface {
    pub router: Router,
    pub manifest: HttpRouteManifest,
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
    Ok(Some(FederatedFeedsOpenSurface {
        router: contribution.router,
        manifest: sdkwork_api_feeds_assembly::open_api_route_manifest(),
    }))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_feeds_consumes_feeds_open_api_contribution() {
        let source = include_str!("feeds_open_runtime.rs");

        assert!(source.contains("sdkwork_api_feeds_assembly::assemble_open_api_contribution_from_env("));
        assert!(source.contains("sdkwork_api_feeds_assembly::open_api_route_manifest("));
        let forbidden_direct_route_crate = ["sdkwork_routes_feeds", "_open_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
    }
}
