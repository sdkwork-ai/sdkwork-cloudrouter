//! Federated invoice route wiring for Claw Router database-backed runtime.

use std::path::PathBuf;
use std::sync::Arc;

use axum::Router;
use sdkwork_claw_http::{merge_federated_app_capability_router, AppSubjectBoundaryConfig};
use sdkwork_iam_embedded_application_bootstrap::resolve_application_app_root;
use sdkwork_invoice_service_host::InvoiceServiceHost;
use sdkwork_routes_invoice_app_api::build_invoice_app_router;

pub async fn wire_invoice_app_router() -> Result<Router, String> {
    apply_clawrouter_invoice_database_env();
    sdkwork_invoice_database_host::bootstrap_invoice_database_from_env()
        .await
        .map_err(|error| format!("failed to bootstrap invoice database lifecycle: {error}"))?;
    let host = Arc::new(InvoiceServiceHost::from_env().await?);
    Ok(build_invoice_app_router(host))
}

pub async fn merge_federated_invoice_app_router(
    router: Router,
    subject_boundary_config: AppSubjectBoundaryConfig,
) -> Result<Router, String> {
    let invoice_router = wire_invoice_app_router().await?;
    Ok(merge_federated_app_capability_router(
        router,
        invoice_router,
        subject_boundary_config,
    ))
}

fn apply_clawrouter_invoice_database_env() {
    let app_root = resolve_clawrouter_app_root();
    sdkwork_iam_database_host::unified_postgres_env::apply_unified_claw_postgres_env(&app_root);
}

fn resolve_clawrouter_app_root() -> PathBuf {
    resolve_application_app_root().unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../..")
            .canonicalize()
            .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
    })
}
