use std::path::{Path, PathBuf};
use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};

/// Ensures IAM database env is materialized from the claw unified postgres profile when needed.
pub fn ensure_iam_database_env_for_claw_database(database_config: &DatabaseConfig) {
    if std::env::var("SDKWORK_IAM_DATABASE_URL")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .is_some()
    {
        return;
    }

    if database_config.engine != DatabaseEngine::Postgres {
        return;
    }

    let app_root = resolve_clawrouter_app_root();
    sdkwork_iam_database_host::unified_postgres_env::apply_unified_claw_postgres_env(&app_root);
}

/// Materialize federated T1 capability database env from the active claw database profile.
///
/// Standalone gateway tests and embedded runtimes pass `DatabaseConfig` directly without
/// exporting `SDKWORK_CLAW_DATABASE_URL`; invoice and other federated hosts must still
/// resolve the same database URL/engine as the product installer.
const FEDERATED_CAPABILITY_SERVICE_CODES: &[&str] = &[
    "ACCOUNT",
    "CATALOG",
    "INVOICE",
    "MEMBERSHIP",
    "ORDER",
    "PAYMENT",
    "PROMOTION",
    "SHOP",
];

const FEDERATED_CAPABILITY_REPO_DIRS: &[(&str, &str)] = &[
    ("ACCOUNT", "sdkwork-account"),
    ("CATALOG", "sdkwork-catalog"),
    ("INVOICE", "sdkwork-invoice"),
    ("MEMBERSHIP", "sdkwork-membership"),
    ("ORDER", "sdkwork-order"),
    ("PAYMENT", "sdkwork-payment"),
    ("PROMOTION", "sdkwork-promotion"),
    ("SHOP", "sdkwork-shop"),
];

pub fn materialize_federated_database_env_from_claw_config(database_config: &DatabaseConfig) {
    for service_code in FEDERATED_CAPABILITY_SERVICE_CODES {
        materialize_capability_database_env(service_code, database_config);
    }
    materialize_federated_capability_app_roots();
    materialize_federated_commerce_lifecycle_env();
    ensure_iam_database_env_for_claw_database(database_config);
}

fn materialize_federated_commerce_lifecycle_env() {
    // Claw Router composes legacy appbase commerce tables with T1 route handlers. Account L3
    // migrations must not run against that schema until the unified cutover is complete.
    materialize_capability_auto_migrate_env("ACCOUNT", false);
    materialize_capability_auto_migrate_env("MEMBERSHIP", false);
    materialize_capability_env_when_unset("SDKWORK_PAYMENT_FEDERATED_COMMERCE", "true");
}

fn materialize_capability_env_when_unset(key: &str, value: &str) {
    if std::env::var(key)
        .ok()
        .filter(|existing| !existing.trim().is_empty())
        .is_some()
    {
        return;
    }

    // SAFETY: router bootstrap runs sequentially on the main thread before async handlers start.
    unsafe {
        std::env::set_var(key, value);
    }
}

fn materialize_capability_auto_migrate_env(service_code: &str, auto_migrate: bool) {
    let key = format!("SDKWORK_{service_code}_AUTO_MIGRATE");
    if std::env::var(&key)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .is_some()
    {
        return;
    }

    // SAFETY: router bootstrap runs sequentially on the main thread before async handlers start.
    unsafe {
        std::env::set_var(&key, if auto_migrate { "true" } else { "false" });
    }
}

fn materialize_federated_capability_app_roots() {
    let claw_root = resolve_clawrouter_app_root();
    for (service_code, repo_dir) in FEDERATED_CAPABILITY_REPO_DIRS {
        materialize_capability_app_root_env(
            service_code,
            sibling_capability_app_root(&claw_root, repo_dir),
        );
    }
}

fn sibling_capability_app_root(claw_root: &Path, repo_dir: &str) -> PathBuf {
    claw_root
        .join("..")
        .join(repo_dir)
        .canonicalize()
        .unwrap_or_else(|_| claw_root.join("..").join(repo_dir))
}

fn materialize_capability_app_root_env(service_code: &str, app_root: PathBuf) {
    let key = format!("SDKWORK_{service_code}_APP_ROOT");
    if std::env::var(&key)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .is_some()
    {
        return;
    }

    // SAFETY: router bootstrap runs sequentially on the main thread before async handlers start.
    unsafe {
        std::env::set_var(&key, app_root.as_os_str());
    }
}

fn materialize_capability_database_env(service_code: &str, database_config: &DatabaseConfig) {
    let prefix = format!("SDKWORK_{}", service_code.to_uppercase());
    let database_url_key = format!("{prefix}_DATABASE_URL");

    // SAFETY: router bootstrap runs sequentially on the main thread before async handlers start.
    unsafe {
        std::env::set_var(&database_url_key, database_config.url.as_str());
        std::env::set_var(
            format!("{prefix}_DATABASE_ENGINE"),
            match database_config.engine {
                DatabaseEngine::Postgres => "postgres",
                DatabaseEngine::Sqlite => "sqlite",
            },
        );
        std::env::set_var(
            format!("{prefix}_DATABASE_MAX_CONNECTIONS"),
            database_config.max_connections.to_string(),
        );
    }
}

fn resolve_clawrouter_app_root() -> PathBuf {
    for key in [
        "SDKWORK_CLAW_APP_ROOT",
        "SDKWORK_APP_ROOT",
        "SDKWORK_CLAW_ROUTER_APP_ROOT",
    ] {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return PathBuf::from(trimmed);
            }
        }
    }

    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

#[cfg(test)]
mod tests {
    use super::{
        ensure_iam_database_env_for_claw_database, resolve_clawrouter_app_root,
    };
    use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};

    #[test]
    fn resolve_clawrouter_app_root_returns_path() {
        let root = resolve_clawrouter_app_root();
        assert!(!root.as_os_str().is_empty());
    }

    #[test]
    fn ensure_iam_database_env_skips_when_iam_url_already_set() {
        let prior = std::env::var("SDKWORK_IAM_DATABASE_URL").ok();
        std::env::set_var(
            "SDKWORK_IAM_DATABASE_URL",
            "postgresql://iam:iam@127.0.0.1:5432/iam",
        );
        let config = DatabaseConfig {
            engine: DatabaseEngine::Postgres,
            url: "postgresql://claw:claw@127.0.0.1:5432/claw".to_owned(),
            max_connections: 5,
        };
        ensure_iam_database_env_for_claw_database(&config);
        assert_eq!(
            std::env::var("SDKWORK_IAM_DATABASE_URL").expect("iam url"),
            "postgresql://iam:iam@127.0.0.1:5432/iam"
        );
        match prior {
            Some(value) => std::env::set_var("SDKWORK_IAM_DATABASE_URL", value),
            None => std::env::remove_var("SDKWORK_IAM_DATABASE_URL"),
        }
    }
}
