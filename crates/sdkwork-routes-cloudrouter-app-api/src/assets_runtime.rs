//! Federated Assets app-api route wiring for Cloud Router database-backed runtime.
//!
//! The unified runtime composes the Assets catalog surface (`/app/v3/api/assets*`)
//! through the dependency-owned `sdkwork-api-assets-assembly` contribution so
//! that the Cloud Router gateway serves the same Assets App API as the Agents
//! standalone gateway. Dependency assembly composition keeps route, manifest,
//! permission, and readiness ownership inside sdkwork-assets; the gateway only
//! merges the executable contribution through the dependency's public assembly
//! entrypoint (API_ASSEMBLY_SPEC §3).

use std::sync::Arc;

use axum::extract::{Request, State};
use axum::middleware::{from_fn_with_state, Next};
use axum::response::Response;
use axum::Router;
use sdkwork_cloudrouter_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_cloudrouter_http::{
    materialize_federated_database_env_from_config,
    merge_federated_app_capability_router_with_optional_auth, AppSubjectBoundaryConfig,
};
use sdkwork_web_core::{DomainContextInjector, WebRequestContext};

/// Runs the Assets contribution domain-context injectors after the host web
/// framework layer has resolved `WebRequestContext`, so Assets handlers can
/// extract `DriveRequestContext` exactly as they do inside sdkwork-assets.
async fn inject_assets_domain_context(
    State(injectors): State<Vec<Arc<dyn DomainContextInjector>>>,
    mut request: Request,
    next: Next,
) -> Response {
    if let Some(context) = request.extensions().get::<WebRequestContext>().cloned() {
        for injector in &injectors {
            injector.inject(&mut request, &context);
        }
    }
    next.run(request).await
}

/// Composes the Assets App API contribution from the dependency-owned assembly.
///
/// The contribution bootstrap reuses the Drive database host because asset
/// metadata is stored in `dr_drive_node`, so the shared workspace PostgreSQL
/// profile must be materialized before assembly.
async fn wire_assets_app_router(database_config: &DatabaseConfig) -> Result<Router, String> {
    materialize_federated_database_env_from_config(database_config);
    let contribution = sdkwork_api_assets_assembly::assemble_app_api_contribution()
        .await
        .map_err(|error| format!("compose sdkwork-assets app-api contribution failed: {error}"))?;
    Ok(contribution.router.layer(from_fn_with_state(
        contribution.domain_context_injectors,
        inject_assets_domain_context,
    )))
}

/// Merges the Assets App API surface into the unified Cloud Router app router.
///
/// The Assets managed store requires PostgreSQL (its bootstrap connects through
/// `SDKWORK_DATABASE_URL`), so SQLite/desktop profiles skip the surface and
/// keep the gateway bootstrap independent.
pub async fn merge_federated_assets_app_router(
    router: Router,
    database_config: &DatabaseConfig,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    if database_config.engine != DatabaseEngine::Postgres {
        tracing::info!(
            target: "sdkwork.cloudrouter.assets",
            engine = ?database_config.engine,
            "assets app-api surface skipped (requires PostgreSQL)",
        );
        return Ok(router);
    }
    let assets_router = wire_assets_app_router(database_config).await?;
    Ok(merge_federated_app_capability_router_with_optional_auth(
        router,
        assets_router,
        subject_boundary_config,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_assets_consumes_assets_app_api_contribution() {
        let source = include_str!("assets_runtime.rs");

        assert!(source.contains("sdkwork_api_assets_assembly::assemble_app_api_contribution("));
        assert!(source.contains("merge_federated_app_capability_router_with_optional_auth("));
        assert!(source.contains("domain_context_injectors"));
        assert!(source.contains("from_fn_with_state("));
        let forbidden_direct_route_crate = ["sdkwork_routes_assets", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
        assert!(source.contains("DatabaseEngine::Postgres"));
    }
}
