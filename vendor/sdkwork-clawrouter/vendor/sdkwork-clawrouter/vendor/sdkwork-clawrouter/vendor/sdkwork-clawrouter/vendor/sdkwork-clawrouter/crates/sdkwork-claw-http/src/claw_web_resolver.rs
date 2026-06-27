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
