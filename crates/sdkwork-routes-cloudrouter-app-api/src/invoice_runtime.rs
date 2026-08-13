//! Federated invoice route wiring for Cloud Router database-backed runtime.

use axum::Router;
use sdkwork_cloudrouter_http::{merge_federated_app_capability_router, AppSubjectBoundaryConfig};
use sdkwork_database_sqlx::DatabasePool;

/// Composes the Invoice App API surface from the dependency-owned assembly.
///
/// Dependency assembly composition keeps route, manifest, permission, and
/// readiness ownership inside sdkwork-invoice; the gateway only merges the
/// executable contribution through the dependency's public assembly entrypoint
/// (API_ASSEMBLY_SPEC §3). A shared pool is used when one is available;
/// pool-less entry points fall back to the standalone env bootstrap.
pub async fn wire_invoice_app_router(
    database_pool: Option<&DatabasePool>,
) -> Result<Router, String> {
    let contribution = match database_pool {
        Some(pool) => {
            sdkwork_api_invoice_assembly::assemble_app_api_contribution_with_pool(pool.clone())
                .await?
        }
        None => sdkwork_api_invoice_assembly::assemble_app_api_contribution_from_env().await?,
    };
    Ok(contribution.router)
}

pub async fn merge_federated_invoice_app_router(
    router: Router,
    database_pool: Option<&DatabasePool>,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    let invoice_router = wire_invoice_app_router(database_pool).await?;
    Ok(merge_federated_app_capability_router(
        router,
        invoice_router,
        subject_boundary_config,
    ))
}
