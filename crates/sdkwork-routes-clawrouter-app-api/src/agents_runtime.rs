//! Federated Agents app-api route wiring for Claw Router database-backed runtime.
//!
//! The unified runtime composes the Agents managed-store surface through the
//! dependency-owned `sdkwork-api-agents-assembly` contribution so that
//! `/app/v3/api/ai/*` (agents, projects, sessions, workspaces, ...) is served
//! directly by the Claw Router gateway. Dependency assembly composition keeps
//! route, manifest, permission, and readiness ownership inside sdkwork-agents;
//! the gateway only merges the executable contribution through the dependency's
//! public assembly entrypoint (API_ASSEMBLY_SPEC §3).

use std::sync::Arc;

use axum::extract::{Request, State};
use axum::middleware::{from_fn_with_state, Next};
use axum::response::Response;
use axum::Router;
use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_claw_http::{
    materialize_federated_database_env_from_config,
    merge_federated_app_capability_router_with_optional_auth, AppSubjectBoundaryConfig,
};
use sdkwork_web_core::{DomainContextInjector, WebRequestContext};

/// Runs the Agents contribution domain-context injectors after the host web
/// framework layer has resolved `WebRequestContext`, so Agents handlers can
/// extract `AgentRequestContext` exactly as they do inside sdkwork-agents.
async fn inject_agents_domain_context(
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

/// Composes the Agents App API contribution from the dependency-owned assembly.
///
/// The contribution bootstrap builds `AgentHttpState` (repository, audit sink,
/// policy provider, turn executor) and applies the Agents database lifecycle on
/// the materialized workspace PostgreSQL profile.
async fn wire_agents_app_router(database_config: &DatabaseConfig) -> Result<Router, String> {
    materialize_federated_database_env_from_config(database_config);
    let contribution = sdkwork_api_agents_assembly::assemble_app_api_contribution()
        .await
        .map_err(|error| format!("compose sdkwork-agents app-api contribution failed: {error}"))?;
    Ok(contribution
        .router
        .layer(from_fn_with_state(
            contribution.domain_context_injectors,
            inject_agents_domain_context,
        )))
}

/// Merges the Agents App API surface into the unified Claw Router app router.
///
/// The Agents managed store requires PostgreSQL (its sync adapter rejects other
/// engines), so SQLite/desktop profiles skip the surface and keep the gateway
/// bootstrap independent.
pub async fn merge_federated_agents_app_router(
    router: Router,
    database_config: &DatabaseConfig,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    if database_config.engine != DatabaseEngine::Postgres {
        tracing::info!(
            target: "sdkwork.clawrouter.agents",
            engine = ?database_config.engine,
            "agents app-api surface skipped (requires PostgreSQL)",
        );
        return Ok(router);
    }
    let agents_router = wire_agents_app_router(database_config).await?;
    Ok(merge_federated_app_capability_router_with_optional_auth(
        router,
        agents_router,
        subject_boundary_config,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_agents_consumes_agents_app_api_contribution() {
        let source = include_str!("agents_runtime.rs");

        assert!(source.contains("sdkwork_api_agents_assembly::assemble_app_api_contribution("));
        assert!(source.contains("merge_federated_app_capability_router_with_optional_auth("));
        assert!(source.contains("domain_context_injectors"));
        assert!(source.contains("from_fn_with_state("));
        let forbidden_direct_route_crate = ["sdkwork_routes_agents", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
        assert!(source.contains("DatabaseEngine::Postgres"));
    }
}
