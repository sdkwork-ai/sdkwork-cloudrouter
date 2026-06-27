use std::path::PathBuf;

use sdkwork_iam_embedded_application_bootstrap::{
    ensure_tenant_application_from_app_root_with_env_and_fallback, resolve_application_app_root,
    EmbeddedApplicationBootstrapOptions,
};

use super::installer::DatabaseInstallError;

pub async fn ensure_clawrouter_tenant_application_bootstrap(
    options: &super::installer::DatabaseInstallOptions,
) -> Result<(), DatabaseInstallError> {
    let app_root = resolve_clawrouter_app_root();
    let bootstrap_options = EmbeddedApplicationBootstrapOptions {
        environment: options.environment.clone(),
        version_override: Some(env!("CARGO_PKG_VERSION").to_owned()),
        ..EmbeddedApplicationBootstrapOptions::default()
    };

    ensure_tenant_application_from_app_root_with_env_and_fallback(
        bootstrap_options.environment.as_str(),
        app_root,
        None,
        &[],
    )
        .await
        .map_err(|error| {
            DatabaseInstallError::InvalidState(format!(
                "ensure clawrouter IAM embedded application bootstrap failed: {error}"
            ))
        })
}

pub async fn ensure_postgres_clawrouter_tenant_application(
    pool: &sqlx::PgPool,
    options: &super::installer::DatabaseInstallOptions,
) -> Result<(), DatabaseInstallError> {
    let _ = pool;
    ensure_clawrouter_tenant_application_bootstrap(options).await
}

fn resolve_clawrouter_app_root() -> PathBuf {
    resolve_application_app_root().unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../..")
            .canonicalize()
            .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clawrouter_app_root_resolves_to_repository_root() {
        let root = resolve_clawrouter_app_root();
        assert!(root.join("sdkwork.app.config.json").is_file());
    }

    #[test]
    fn resolve_clawrouter_app_root_prefers_sdkwork_app_root_env() {
        let temp = std::env::temp_dir().join(format!(
            "clawrouter-app-root-test-{}",
            std::process::id()
        ));
        let _ = std::fs::create_dir_all(&temp);
        let previous = std::env::var("SDKWORK_APP_ROOT").ok();
        unsafe {
            std::env::set_var("SDKWORK_APP_ROOT", temp.as_os_str());
        }
        assert_eq!(temp, resolve_clawrouter_app_root());
        unsafe {
            match previous {
                Some(value) => std::env::set_var("SDKWORK_APP_ROOT", value),
                None => std::env::remove_var("SDKWORK_APP_ROOT"),
            }
        }
        let _ = std::fs::remove_dir_all(temp);
    }
}
