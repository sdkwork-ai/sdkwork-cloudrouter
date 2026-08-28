//! Federated Skills app-api route wiring for Cloud Router database-backed runtime.
//!
//! The unified runtime composes the Skills marketplace surface
//! (`/app/v3/api/skill_*`) through the dependency-owned
//! `sdkwork-api-skills-assembly` contribution so that the Cloud Router gateway
//! serves the same Skills App API as the Skills standalone gateway. Dependency
//! assembly composition keeps route, manifest, permission, and readiness
//! ownership inside sdkwork-skills; the gateway only merges the executable
//! contribution through the dependency's public assembly entrypoint
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

/// Runs the Skills contribution domain-context injectors after the host web
/// framework layer has resolved `WebRequestContext`.
async fn inject_skills_domain_context(
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

/// Composes the Skills App API contribution from the dependency-owned assembly.
async fn wire_skills_app_router(database_config: &DatabaseConfig) -> Result<Router, String> {
    materialize_federated_database_env_from_config(database_config);
    let contribution = sdkwork_api_skills_assembly::assemble_app_api_contribution()
        .await
        .map_err(|error| format!("compose sdkwork-skills app-api contribution failed: {error}"))?;
    Ok(contribution.router.layer(from_fn_with_state(
        contribution.domain_context_injectors,
        inject_skills_domain_context,
    )))
}

/// Merges the Skills App API surface into the unified Cloud Router app router.
///
/// The Skills managed store requires PostgreSQL, so SQLite/desktop profiles
/// skip the surface and keep the gateway bootstrap independent.
pub async fn merge_federated_skills_app_router(
    router: Router,
    database_config: &DatabaseConfig,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    if database_config.engine != DatabaseEngine::Postgres {
        tracing::info!(
            target: "sdkwork.cloudrouter.skills",
            engine = ?database_config.engine,
            "skills app-api surface skipped (requires PostgreSQL)",
        );
        return Ok(router);
    }
    let skills_router = wire_skills_app_router(database_config).await?;
    Ok(merge_federated_app_capability_router_with_optional_auth(
        router,
        skills_router,
        subject_boundary_config,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_skills_consumes_skills_app_api_contribution() {
        let source = include_str!("skills_runtime.rs");

        assert!(source.contains("sdkwork_api_skills_assembly::assemble_app_api_contribution("));
        assert!(source.contains("merge_federated_app_capability_router_with_optional_auth("));
        assert!(source.contains("domain_context_injectors"));
        assert!(source.contains("from_fn_with_state("));
        let forbidden_direct_route_crate = ["sdkwork_routes_skills", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
        assert!(source.contains("DatabaseEngine::Postgres"));
    }
}
