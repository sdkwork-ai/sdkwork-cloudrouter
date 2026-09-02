//! Federated Generations app-api route wiring for Cloud Router database-backed runtime.
//!
//! The unified runtime composes the Generations intelligence surface
//! (`/app/v3/api/generations*`) through the dependency-owned
//! `sdkwork-api-generations-assembly` contribution so that the Cloud Router
//! gateway serves the same Generations App API as the Generations standalone
//! gateway. Dependency assembly composition keeps route, manifest, permission,
//! and readiness ownership inside sdkwork-generations; the gateway only merges
//! the executable contribution through the dependency's public assembly
//! entrypoint (API_ASSEMBLY_SPEC §3). The contribution runs on the
//! process-shared database pool.

use std::sync::Arc;

use axum::extract::{Request, State};
use axum::middleware::{from_fn_with_state, Next};
use axum::response::Response;
use axum::Router;
use sdkwork_cloudrouter_http::{
    merge_federated_app_capability_router_with_optional_auth, AppSubjectBoundaryConfig,
};
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_web_core::{DomainContextInjector, WebRequestContext};

/// Runs the Generations contribution domain-context injectors after the host web
/// framework layer has resolved `WebRequestContext`.
async fn inject_generations_domain_context(
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

/// Composes the Generations App API contribution on the process-shared pool.
async fn wire_generations_app_router(database_pool: DatabasePool) -> Result<Router, String> {
    let contribution =
        sdkwork_api_generations_assembly::assemble_api_router_with_pool(database_pool)
            .await
            .map_err(|error| {
                format!("compose sdkwork-generations app-api contribution failed: {error}")
            })?;
    Ok(contribution.router.layer(from_fn_with_state(
        contribution.domain_context_injectors,
        inject_generations_domain_context,
    )))
}

/// Merges the Generations App API surface into the unified Cloud Router app router.
///
/// The Generations managed store requires PostgreSQL, so SQLite/desktop profiles
/// skip the surface and keep the gateway bootstrap independent.
pub async fn merge_federated_generations_app_router(
    router: Router,
    database_pool: &DatabasePool,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    if database_pool.as_postgres().is_none() {
        tracing::info!(
            target: "sdkwork.cloudrouter.generations",
            engine = ?database_pool.engine(),
            "generations app-api surface skipped (requires PostgreSQL)",
        );
        return Ok(router);
    }
    let generations_router = wire_generations_app_router(database_pool.clone()).await?;
    Ok(merge_federated_app_capability_router_with_optional_auth(
        router,
        generations_router,
        subject_boundary_config,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_generations_consumes_generations_app_api_contribution() {
        let source = include_str!("generations_runtime.rs");

        assert!(source.contains("sdkwork_api_generations_assembly::assemble_api_router_with_pool("));
        assert!(source.contains("merge_federated_app_capability_router_with_optional_auth("));
        assert!(source.contains("domain_context_injectors"));
        assert!(source.contains("from_fn_with_state("));
        assert!(source.contains("database_pool.as_postgres()"));
        let forbidden_direct_route_crate = ["sdkwork_routes_generations", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
    }
}
