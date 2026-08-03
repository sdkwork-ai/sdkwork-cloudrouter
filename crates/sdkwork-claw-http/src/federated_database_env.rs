use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};
use std::path::{Path, PathBuf};

/// Ensures the canonical workspace database env is materialized from application config.
pub fn ensure_workspace_database_env_from_config(database_config: &DatabaseConfig) {
    if std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .is_some()
    {
        return;
    }

    materialize_workspace_database_env(database_config);
}

/// Materialize federated T1 capability env from the active workspace database profile.
///
/// Standalone gateway tests and embedded runtimes pass `DatabaseConfig` directly without
/// exporting `SDKWORK_DATABASE_URL`; invoice and other federated hosts must still
/// resolve the same database URL/engine as the product installer.
const FEDERATED_CAPABILITY_REPO_DIRS: &[(&str, &str)] = &[
    ("ACCOUNT", "sdkwork-account"),
    ("AGENTS", "sdkwork-agents"),
    ("CATALOG", "sdkwork-catalog"),
    ("INVOICE", "sdkwork-invoice"),
    ("MEMBERSHIP", "sdkwork-membership"),
    ("ORDER", "sdkwork-order"),
    ("PAYMENT", "sdkwork-payment"),
    ("PROMOTION", "sdkwork-promotion"),
    ("SHOP", "sdkwork-shop"),
];

pub fn materialize_federated_database_env_from_config(database_config: &DatabaseConfig) {
    materialize_workspace_database_env(database_config);
    materialize_federated_capability_app_roots();
    materialize_federated_commerce_lifecycle_env();
}

fn materialize_federated_commerce_lifecycle_env() {
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

fn materialize_workspace_database_env(database_config: &DatabaseConfig) {
    // SAFETY: router bootstrap runs sequentially on the main thread before async handlers start.
    unsafe {
        std::env::set_var("SDKWORK_DATABASE_URL", &database_config.url);
        std::env::set_var(
            "SDKWORK_DATABASE_ENGINE",
            match database_config.engine {
                DatabaseEngine::Postgres => "postgres",
                DatabaseEngine::Sqlite => "sqlite",
            },
        );
        std::env::set_var(
            "SDKWORK_DATABASE_MAX_CONNECTIONS",
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
        ensure_workspace_database_env_from_config, materialize_federated_commerce_lifecycle_env,
        materialize_workspace_database_env, resolve_clawrouter_app_root,
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
    fn workspace_database_env_preserves_existing_url() {
        let _lock = ENV_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        let prior = std::env::var("SDKWORK_DATABASE_URL").ok();
        std::env::set_var(
            "SDKWORK_DATABASE_URL",
            "postgresql://iam:iam@127.0.0.1:5432/iam",
        );
        let config = DatabaseConfig {
            engine: DatabaseEngine::Postgres,
            url: "postgresql://claw:claw@127.0.0.1:5432/claw".to_owned(),
            max_connections: 5,
        };
        ensure_workspace_database_env_from_config(&config);
        assert_eq!(
            std::env::var("SDKWORK_DATABASE_URL").expect("iam url"),
            "postgresql://iam:iam@127.0.0.1:5432/iam"
        );
        match prior {
            Some(value) => std::env::set_var("SDKWORK_DATABASE_URL", value),
            None => std::env::remove_var("SDKWORK_DATABASE_URL"),
        }
    }

    #[test]
    fn workspace_database_env_materializes_sqlite_process_identity() {
        let _lock = ENV_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        let keys = [
            "SDKWORK_DATABASE_URL",
            "SDKWORK_DATABASE_ENGINE",
            "SDKWORK_DATABASE_MAX_CONNECTIONS",
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

        ensure_workspace_database_env_from_config(&config);

        assert_eq!(std::env::var("SDKWORK_DATABASE_URL").unwrap(), config.url);
        assert_eq!(std::env::var("SDKWORK_DATABASE_ENGINE").unwrap(), "sqlite");
        assert_eq!(
            std::env::var("SDKWORK_DATABASE_MAX_CONNECTIONS").unwrap(),
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
    fn federated_commerce_lifecycle_uses_database_scoped_env_keys() {
        let _lock = ENV_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        let keys = ["SDKWORK_PAYMENT_FEDERATED_COMMERCE"];
        let previous = keys.map(|key| (key, std::env::var(key).ok()));
        for key in keys {
            std::env::remove_var(key);
        }

        materialize_federated_commerce_lifecycle_env();

        assert_eq!(
            std::env::var("SDKWORK_PAYMENT_FEDERATED_COMMERCE").unwrap(),
            "true"
        );
        for service_code in ["ACCOUNT", "MEMBERSHIP"] {
            assert!(std::env::var(format!(
                "SDKWORK_{service_code}_{}",
                "DATABASE_AUTO_MIGRATE"
            ))
            .is_err());
        }

        for (key, value) in previous {
            match value {
                Some(value) => std::env::set_var(key, value),
                None => std::env::remove_var(key),
            }
        }
    }

    #[test]
    fn materialize_postgres_workspace_env_preserves_canonical_config_url() {
        let _lock = ENV_LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();
        let keys = [
            "SDKWORK_DATABASE_SCHEMA",
            "SDKWORK_DATABASE_URL",
            "SDKWORK_DATABASE_ENGINE",
            "SDKWORK_DATABASE_MAX_CONNECTIONS",
        ];
        let previous = keys.map(|key| (key, std::env::var(key).ok()));
        std::env::set_var("SDKWORK_DATABASE_SCHEMA", "sdkwork_ai_dev");

        let config = DatabaseConfig {
            engine: DatabaseEngine::Postgres,
            url: "postgresql://sdkwork_ai_dev:secret@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
                .to_owned(),
            max_connections: 5,
        };
        materialize_workspace_database_env(&config);

        assert_eq!(
            std::env::var("SDKWORK_DATABASE_URL").expect("workspace database url"),
            config.url
        );

        for (key, value) in previous {
            match value {
                Some(value) => std::env::set_var(key, value),
                None => std::env::remove_var(key),
            }
        }
    }
}
