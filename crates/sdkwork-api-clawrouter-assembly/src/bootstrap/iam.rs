use std::path::PathBuf;

use axum::Router;
use sdkwork_iam_embedded_application_bootstrap::{
    ensure_tenant_application_from_app_root, resolve_bootstrap_environment,
    EmbeddedApplicationBootstrapOptions,
};

fn resolve_clawrouter_app_root() -> PathBuf {
    for key in ["SDKWORK_APP_ROOT", "SDKWORK_CLAWROUTER_APP_ROOT"] {
        if let Some(value) = std::env::var_os(key).filter(|value| !value.is_empty()) {
            return PathBuf::from(value);
        }
    }

    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

pub(super) async fn wire_iam_app_router() -> anyhow::Result<Router> {
    sdkwork_iam_database_host::bootstrap_iam_database_from_env()
        .await
        .map_err(anyhow::Error::msg)?;

    ensure_tenant_application_from_app_root(
        resolve_clawrouter_app_root().as_path(),
        &EmbeddedApplicationBootstrapOptions {
            environment: resolve_bootstrap_environment(),
            version_override: Some(env!("CARGO_PKG_VERSION").to_owned()),
            ..EmbeddedApplicationBootstrapOptions::default()
        },
        None,
        &[],
    )
    .await
    .map_err(anyhow::Error::msg)?;

    sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router()
        .await
        .map_err(anyhow::Error::msg)
}

#[cfg(test)]
mod tests {
    use super::resolve_clawrouter_app_root;

    #[test]
    fn default_app_root_contains_application_manifest() {
        assert!(resolve_clawrouter_app_root()
            .join("sdkwork.app.config.json")
            .is_file());
    }
}
