use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_database_config::claw_database::postgres_url_with_search_path;
use std::path::{Path, PathBuf};

/// Ensures IAM database env is materialized from the canonical Claw database config.
pub fn ensure_iam_database_env_for_claw_database(database_config: &DatabaseConfig) {
    if std::env::var("SDKWORK_IAM_DATABASE_URL")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .is_some()
    {
        return;
    }

    materialize_capability_database_env("IAM", database_config);
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
    let database_url = match database_config.engine {
        DatabaseEngine::Postgres => {
            postgres_url_with_search_path(&database_config.url, prefix.as_str())
        }
        DatabaseEngine::Sqlite => database_config.url.clone(),
    };

    // SAFETY: router bootstrap runs sequentially on the main thread before async handlers start.
    unsafe {
        std::env::set_var(&database_url_key, database_url);
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
        ensure_iam_database_env_for_claw_database, materialize_capability_database_env,
        resolve_clawrouter_app_root,
    };
    use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};
    use std::sync::{Mutex, OnceLock};

    static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    #[test]
    fn resolve_clawrouter_app_root_returns_path() {
        let root = resolve_clawrouter_app_root();
        assert!(!root.as_os_str().is_empty());
    }

    #[test]
    fn ensure_iam_database_env_skips_when_iam_url_already_set() {
        let _lock = ENV_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
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

    #[test]
    fn ensure_iam_database_env_materializes_sqlite_process_identity() {
        let _lock = ENV_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        let keys = [
            "SDKWORK_IAM_DATABASE_URL",
            "SDKWORK_IAM_DATABASE_ENGINE",
            "SDKWORK_IAM_DATABASE_MAX_CONNECTIONS",
        ];
        let previous = keys.map(|key| (key, std::env::var(key).ok()));
        for key in keys {
            std::env::remove_var(key);
        }
        let config = DatabaseConfig {
            engine: DatabaseEngine::Sqlite,
            url: "sqlite://target/dev/clawrouter.sqlite".to_owned(),
            max_connections: 1,
        };

        ensure_iam_database_env_for_claw_database(&config);

        assert_eq!(
            std::env::var("SDKWORK_IAM_DATABASE_URL").unwrap(),
            config.url
        );
        assert_eq!(
            std::env::var("SDKWORK_IAM_DATABASE_ENGINE").unwrap(),
            "sqlite"
        );
        assert_eq!(
            std::env::var("SDKWORK_IAM_DATABASE_MAX_CONNECTIONS").unwrap(),
            "1"
        );
        for (key, value) in previous {
            match value {
                Some(value) => std::env::set_var(key, value),
                None => std::env::remove_var(key),
            }
        }
    }

    #[test]
    fn materialize_postgres_capability_env_pins_the_claw_schema() {
        let _lock = ENV_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        let keys = [
            "SDKWORK_CLAW_DATABASE_SCHEMA",
            "SDKWORK_DATABASE_SCHEMA",
            "SDKWORK_PAYMENT_DATABASE_SCHEMA",
            "SDKWORK_PAYMENT_DATABASE_URL",
        ];
        let previous = keys.map(|key| (key, std::env::var(key).ok()));
        std::env::set_var("SDKWORK_CLAW_DATABASE_SCHEMA", "sdkwork_ai_dev");
        std::env::remove_var("SDKWORK_DATABASE_SCHEMA");
        std::env::remove_var("SDKWORK_PAYMENT_DATABASE_SCHEMA");

        let config = DatabaseConfig {
            engine: DatabaseEngine::Postgres,
            url: "postgresql://sdkwork_ai_dev:secret@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
                .to_owned(),
            max_connections: 5,
        };
        materialize_capability_database_env("PAYMENT", &config);

        let url = std::env::var("SDKWORK_PAYMENT_DATABASE_URL").expect("payment database url");
        assert!(url.contains("options=-c%20search_path%3Dsdkwork_ai_dev%2Cpublic"));

        for (key, value) in previous {
            match value {
                Some(value) => std::env::set_var(key, value),
                None => std::env::remove_var(key),
            }
        }
    }
}
