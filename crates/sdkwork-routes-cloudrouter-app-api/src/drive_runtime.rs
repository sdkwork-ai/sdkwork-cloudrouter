//! Federated Drive app-api route wiring for Cloud Router database-backed runtime.
//!
//! The unified runtime composes the Drive global-assets surface
//! (`/app/v3/api/assets*`, collections, archive/restore, relations) through the
//! dependency-owned `sdkwork-api-drive-assembly` contribution so that the
//! Cloud Router gateway serves the same Drive App API as the Drive standalone
//! gateway. Dependency assembly composition keeps route, manifest, permission,
//! and readiness ownership inside sdkwork-drive; the gateway only merges the
//! executable contribution through the dependency's public assembly entrypoint
//! (API_ASSEMBLY_SPEC §3).

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

/// Runs the Drive contribution domain-context injectors after the host web
/// framework layer has resolved `WebRequestContext`, so Drive handlers can
/// extract `DriveRequestContext` exactly as they do inside sdkwork-drive.
async fn inject_drive_domain_context(
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

/// Composes the Drive App API contribution from the dependency-owned assembly.
///
/// The contribution bootstrap owns the Drive database lifecycle on the shared
/// workspace PostgreSQL profile (`SDKWORK_DATABASE_URL`), the auth policy
/// refresh task, download token signing preflight, and the domain outbox
/// dispatcher, so the gateway only merges the ready contribution.
async fn wire_drive_app_router(database_config: &DatabaseConfig) -> Result<Router, String> {
    materialize_federated_database_env_from_config(database_config);
    let contribution = sdkwork_api_drive_assembly::assemble_app_api_contribution()
        .await
        .map_err(|error| format!("compose sdkwork-drive app-api contribution failed: {error}"))?;
    Ok(contribution.router.layer(from_fn_with_state(
        contribution.domain_context_injectors,
        inject_drive_domain_context,
    )))
}

/// Merges the Drive App API surface into the unified Cloud Router app router.
///
/// The Drive managed store requires PostgreSQL (its bootstrap connects through
/// `SDKWORK_DATABASE_URL`), so SQLite/desktop profiles skip the surface and
/// keep the gateway bootstrap independent.
pub async fn merge_federated_drive_app_router(
    router: Router,
    database_config: &DatabaseConfig,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    if database_config.engine != DatabaseEngine::Postgres {
        tracing::info!(
            target: "sdkwork.cloudrouter.drive",
            engine = ?database_config.engine,
            "drive app-api surface skipped (requires PostgreSQL)",
        );
        return Ok(router);
    }
    let drive_router = wire_drive_app_router(database_config).await?;
    Ok(merge_federated_app_capability_router_with_optional_auth(
        router,
        drive_router,
        subject_boundary_config,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_drive_consumes_drive_app_api_contribution() {
        let source = include_str!("drive_runtime.rs");

        assert!(source.contains("sdkwork_api_drive_assembly::assemble_app_api_contribution("));
        assert!(source.contains("merge_federated_app_capability_router_with_optional_auth("));
        assert!(source.contains("domain_context_injectors"));
        assert!(source.contains("from_fn_with_state("));
        let forbidden_direct_route_crate = ["sdkwork_routes_drive", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
        assert!(source.contains("DatabaseEngine::Postgres"));
    }
}
