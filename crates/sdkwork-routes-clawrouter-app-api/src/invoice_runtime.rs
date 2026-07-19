//! Federated invoice route wiring for Claw Router database-backed runtime.

use std::sync::Arc;

use axum::Router;
use sdkwork_claw_http::{merge_federated_app_capability_router, AppSubjectBoundaryConfig};
use sdkwork_invoice_service_host::InvoiceServiceHost;
use sdkwork_routes_invoice_app_api::build_invoice_app_router;

pub async fn wire_invoice_app_router() -> Result<Router, String> {
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
