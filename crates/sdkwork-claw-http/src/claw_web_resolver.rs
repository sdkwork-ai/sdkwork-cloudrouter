use std::path::PathBuf;
use std::sync::Arc;

use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sqlx::PgPool;

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
pub fn materialize_federated_database_env_from_claw_config(database_config: &DatabaseConfig) {
    materialize_capability_database_env("INVOICE", database_config);
    ensure_iam_database_env_for_claw_database(database_config);
}

fn materialize_capability_database_env(service_code: &str, database_config: &DatabaseConfig) {
    let prefix = format!("SDKWORK_{}", service_code.to_uppercase());
    let database_url_key = format!("{prefix}_DATABASE_URL");
    if std::env::var(&database_url_key)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .is_some()
    {
        return;
    }

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

/// Builds the canonical IAM `WebRequestContextResolver` for clawrouter HTTP surfaces.
pub async fn iam_web_resolver_for_claw_database(
    database_config: Option<&DatabaseConfig>,
    postgres_pool: Option<Arc<PgPool>>,
) -> IamWebRequestContextResolver {
    if let Some(config) = database_config {
        ensure_iam_database_env_for_claw_database(config);
    }

    if let Some(pool) = postgres_pool {
        return IamWebRequestContextResolver::new(Some(pool));
    }

    sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await
}

fn resolve_clawrouter_app_root() -> PathBuf {
    std::env::var("SDKWORK_CLAW_APP_ROOT")
        .ok()
        .map(PathBuf::from)
        .or_else(|| {
            std::env::current_dir()
                .ok()
                .and_then(|cwd| cwd.canonicalize().ok())
        })
        .unwrap_or_else(|| PathBuf::from("."))
}

#[cfg(test)]
mod tests {
    use super::{
        ensure_iam_database_env_for_claw_database, iam_web_resolver_for_claw_database,
        resolve_clawrouter_app_root,
    };
    use sdkwork_claw_config::{DatabaseConfig, DatabaseEngine};
    use std::sync::Arc;

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

    #[tokio::test]
    async fn iam_web_resolver_for_claw_database_uses_shared_postgres_pool() {
        let config = DatabaseConfig {
            engine: DatabaseEngine::Sqlite,
            url: "sqlite::memory:".to_owned(),
            max_connections: 1,
        };
        let pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(1)
            .connect_lazy("postgres://invalid-for-lazy-pool")
            .expect("lazy pool");
        let resolver =
            iam_web_resolver_for_claw_database(Some(&config), Some(Arc::new(pool.clone()))).await;
        drop(resolver);
    }
}
