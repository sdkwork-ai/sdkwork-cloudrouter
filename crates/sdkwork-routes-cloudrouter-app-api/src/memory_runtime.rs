//! Federated Memory app-api route wiring for Cloud Router database-backed runtime.
//!
//! The unified runtime serves the Memory console surface (`/app/v3/api/memory*`)
//! through the dependency-owned `sdkwork-api-memory-assembly` **app-api-only**
//! contribution, so the Cloud Router gateway serves the same Memory App API as
//! the Memory standalone gateway. Dependency assembly composition keeps route,
//! manifest, permission, and readiness ownership inside sdkwork-memory; the
//! gateway only merges the executable contribution through the dependency's
//! public assembly entrypoint (API_ASSEMBLY_SPEC §3).
//!
//! The whole-module factories are deliberately not used: `assemble_api_router_from_env`
//! also publishes the Memory `open-api` and `backend-api` surfaces, while the
//! Cloud Router already mounts this owner's open-api capability itself, so
//! merging it would register duplicate method+path pairs.

use axum::Router;
use sdkwork_cloudrouter_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_cloudrouter_http::{
    materialize_federated_database_env_from_config,
    merge_federated_app_capability_router_with_optional_auth, AppSubjectBoundaryConfig,
};

/// Composes the Memory App API contribution from the dependency-owned assembly.
///
/// The contribution keeps the Memory database lifecycle on the shared workspace
/// PostgreSQL profile (`SDKWORK_DATABASE_URL`) and the Memory background plane
/// (extraction and outbox workers) inside sdkwork-memory: the app-api-only
/// factory starts the dependency-owned workers, whose handle carries no `Drop`
/// that stops them, so they run until process exit while every claimed job and
/// outbox row stays lease-fenced.
///
/// No host-side domain-context injector layer is applied here, unlike the
/// Drive/Assets federated runtimes. Memory resolves its request context inside
/// its own Web Framework layer (`MemoryAppContextInjector` in
/// `sdkwork-routes-memory-app-api::web_bootstrap`), so the contribution
/// publishes an empty injector list and this host must not stack a second Web
/// Framework layer on top of an already-wrapped contribution
/// (API_ASSEMBLY_SPEC §6.1).
async fn wire_memory_app_router(database_config: &DatabaseConfig) -> Result<Router, String> {
    materialize_federated_database_env_from_config(database_config);
    let contribution = sdkwork_api_memory_assembly::assemble_app_api_contribution_from_env()
        .await
        .map_err(|error| format!("compose sdkwork-memory app-api contribution failed: {error}"))?;
    Ok(contribution.router)
}

/// Merges the Memory App API surface into the unified Cloud Router app router.
///
/// Memory is authoritative-server by architecture — its database manifest
/// declares the `postgres` engine and the data plane rejects SQLite outside an
/// explicit test runner (ENVIRONMENT_SPEC §7.2) — so SQLite/desktop profiles
/// skip the surface and keep the gateway bootstrap independent.
pub async fn merge_federated_memory_app_router(
    router: Router,
    database_config: &DatabaseConfig,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    if database_config.engine != DatabaseEngine::Postgres {
        tracing::info!(
            target: "sdkwork.cloudrouter.memory",
            engine = ?database_config.engine,
            "memory app-api surface skipped (requires PostgreSQL)",
        );
        return Ok(router);
    }
    let memory_router = wire_memory_app_router(database_config).await?;
    Ok(merge_federated_app_capability_router_with_optional_auth(
        router,
        memory_router,
        subject_boundary_config,
    ))
}

#[cfg(test)]
mod tests {
    #[test]
    fn federated_memory_consumes_memory_app_api_contribution() {
        let source = include_str!("memory_runtime.rs");

        assert!(source.contains(concat!(
            "sdkwork_api_memory_assembly::assemble_app_api_",
            "contribution_from_env("
        )));
        assert!(source.contains("merge_federated_app_capability_router_with_optional_auth("));
        assert!(source.contains("materialize_federated_database_env_from_config("));
        assert!(source.contains("DatabaseEngine::Postgres"));
        // The whole-module factories would republish the Memory open-api and
        // backend-api surfaces the Cloud Router already mounts. Both needles are
        // assembled at compile time so no assertion can satisfy itself.
        assert!(!source.contains(concat!("assemble_api_", "router_from_env()")));
        assert!(!source.contains(concat!(
            "wrap_router_with_web_",
            "framework_from_env"
        )));
        let forbidden_direct_route_crate = ["sdkwork_routes_memory", "_app_api::"].concat();
        assert!(!source.contains(&forbidden_direct_route_crate));
    }

    #[test]
    fn federated_memory_runtime_is_wired_into_the_product_router() {
        // The surface is only served when the product router actually merges it:
        // a declaration in `specs/component.spec.json` with no call site would
        // resolve to `same-origin-embedded` while no route is mounted.
        let routes = include_str!("routes.rs");

        assert!(routes.contains("crate::memory_runtime::merge_federated_memory_app_router("));
    }
}
