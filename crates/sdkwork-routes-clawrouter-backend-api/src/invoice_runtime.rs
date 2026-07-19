//! Federated invoice backend route wiring for Claw Router database-backed runtime.

use std::sync::Arc;

use axum::Router;
use sdkwork_invoice_service_host::InvoiceServiceHost;

pub async fn wire_invoice_backend_router() -> Result<Router, String> {
    sdkwork_invoice_database_host::bootstrap_invoice_database_from_env()
        .await
        .map_err(|error| format!("failed to bootstrap invoice database lifecycle: {error}"))?;
    let host = Arc::new(InvoiceServiceHost::from_env().await?);
    Ok(sdkwork_routes_invoice_backend_api::gateway_mount(host).await)
}

pub async fn merge_federated_invoice_backend_router(router: Router) -> Result<Router, String> {
    Ok(router.merge(wire_invoice_backend_router().await?))
}
