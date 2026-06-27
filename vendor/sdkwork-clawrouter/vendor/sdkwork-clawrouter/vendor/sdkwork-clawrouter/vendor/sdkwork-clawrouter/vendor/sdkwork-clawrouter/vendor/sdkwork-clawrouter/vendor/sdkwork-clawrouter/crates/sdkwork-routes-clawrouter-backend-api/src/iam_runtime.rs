//! Federated IAM backend route wiring for standalone admin runtime.

use std::path::PathBuf;

use axum::Router;
use sdkwork_iam_embedded_application_bootstrap::{
    ensure_tenant_application_from_app_root_with_env_and_fallback,
    resolve_application_app_root, resolve_bootstrap_environment,
};

pub async fn ensure_clawrouter_tenant_application_bootstrap() -> Result<(), String> {
    let app_root = resolve_clawrouter_app_root();
    sdkwork_iam_database_host::unified_postgres_env::apply_unified_claw_postgres_env(&app_root);
    ensure_tenant_application_from_app_root_with_env_and_fallback(
        resolve_bootstrap_environment().as_str(),
        app_root,
        None,
        &[],
    )
    .await
}

pub async fn wire_iam_backend_router() -> Result<Router, String> {
    sdkwork_iam_database_host::bootstrap_iam_database_from_env()
        .await
        .map_err(|error| format!("failed to bootstrap IAM database lifecycle: {error}"))?;
    ensure_clawrouter_tenant_application_bootstrap().await?;
    Ok(sdkwork_routes_iam_backend_api::build_sdkwork_iam_backend_api_router_from_env().await)
}

pub async fn merge_federated_iam_backend_router(router: Router) -> Result<Router, String> {
    Ok(router.merge(wire_iam_backend_router().await?))
}

fn resolve_clawrouter_app_root() -> PathBuf {
    resolve_application_app_root().unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../..")
            .canonicalize()
            .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
    })
}
