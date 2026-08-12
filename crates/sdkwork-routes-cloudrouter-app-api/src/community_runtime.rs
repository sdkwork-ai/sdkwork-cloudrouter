//! Federated Community app-api route wiring for Cloud Router database-backed runtime.
//!
//! The unified runtime composes the Community surface through the
//! dependency-owned `sdkwork-api-community-assembly` contribution so that
//! `/app/v3/api/community/*` (categories, feed, entries, comments, reactions)
//! is served directly by the Cloud Router gateway. Dependency assembly
//! composition keeps route, manifest, permission, and readiness ownership
//! inside sdkwork-community; the gateway only merges the executable
//! contribution through the dependency's public assembly entrypoint
//! (API_ASSEMBLY_SPEC §3). The contribution runs the Community database
//! lifecycle on the process-shared pool.

use axum::Router;
use sdkwork_cloudrouter_http::{merge_federated_app_capability_router, AppSubjectBoundaryConfig};
use sdkwork_database_sqlx::DatabasePool;

/// Composes the Community App API contribution on the process-shared pool.
///
/// The contribution bootstrap builds `CommunityServiceHost` from the shared
/// database pool (applying the Community database baseline, migrations, and
/// seed-on-boot reference data) and returns the unwrapped App surface router.
async fn wire_community_app_router(database_pool: DatabasePool) -> Result<Router, String> {
    let contribution =
        sdkwork_api_community_assembly::assemble_app_api_contribution_with_pool(database_pool)
            .await
            .map_err(|error| {
                format!("compose sdkwork-community app-api contribution failed: {error}")
            })?;
    Ok(contribution.router)
}

/// Merges the Community App API surface into the unified Cloud Router app router.
///
/// The Community managed store requires PostgreSQL (its database host rejects
/// other engines), so SQLite/desktop profiles skip the surface and keep the
/// gateway bootstrap independent.
pub async fn merge_federated_community_app_router(
    router: Router,
    database_pool: &DatabasePool,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    if database_pool.as_postgres().is_none() {
        tracing::info!(
            target: "sdkwork.cloudrouter.community",
            engine = ?database_pool.engine(),
            "community app-api surface skipped (requires PostgreSQL)",
        );
        return Ok(router);
    }
    let community_router = wire_community_app_router(database_pool.clone()).await?;
    Ok(merge_federated_app_capability_router(
        router,
        community_router,
        subject_boundary_config,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_community_consumes_community_app_api_contribution() {
        let source = include_str!("community_runtime.rs");

        assert!(source.contains("sdkwork_api_community_assembly::assemble_app_api_contribution("));
        assert!(source.contains("merge_federated_app_capability_router("));
        assert!(source.contains("database_pool.as_postgres()"));
        let forbidden_direct_route_crate = ["sdkwork_routes_community", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
    }
}
