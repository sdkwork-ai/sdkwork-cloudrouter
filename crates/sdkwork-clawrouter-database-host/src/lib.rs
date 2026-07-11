use std::path::PathBuf;
use std::sync::Arc;

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_lifecycle::{lifecycle_options_from_env, LifecycleOrchestrator};
use sdkwork_database_spi::{DatabaseAssetProvider, DatabaseManifest, DefaultDatabaseModule};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};

pub struct ClawRouterDatabaseHost {
    pool: DatabasePool,
    module: Arc<DefaultDatabaseModule>,
}

impl ClawRouterDatabaseHost {
    pub fn pool(&self) -> &DatabasePool {
        &self.pool
    }

    pub fn module(&self) -> Arc<DefaultDatabaseModule> {
        self.module.clone()
    }

    fn orchestrator(&self, applied_by: &str) -> LifecycleOrchestrator {
        LifecycleOrchestrator::new(self.pool.clone(), self.module.clone())
            .with_applied_by(applied_by)
    }

    /// Applies the canonical baseline and all pending migrations.
    ///
    /// This is an explicit release/installer operation. Runtime startup must
    /// use [`connect_claw_router_database`] unless its guarded development
    /// policy deliberately opts into migration.
    pub async fn migrate(&self, applied_by: &str) -> Result<usize, String> {
        let orchestrator = self.orchestrator(applied_by);
        orchestrator
            .init()
            .await
            .map_err(|error| format!("claw router database init failed: {error}"))?;
        orchestrator
            .migrate()
            .await
            .map_err(|error| format!("claw router database migrate failed: {error}"))
    }

    pub async fn plan_migrations(&self) -> Result<usize, String> {
        self.orchestrator("sdkwork-clawrouter-plan")
            .plan_migrations()
            .await
            .map(|migrations| migrations.len())
            .map_err(|error| format!("claw router database migration plan failed: {error}"))
    }
}

/// Loads the canonical database module around an existing pool without
/// creating history tables, applying a baseline, running migrations, or
/// seeding data.
pub fn connect_claw_router_database(pool: DatabasePool) -> Result<ClawRouterDatabaseHost, String> {
    let app_root = resolve_app_root();
    let module = Arc::new(
        DefaultDatabaseModule::from_app_root(&app_root)
            .map_err(|error| format!("load claw router database module failed: {error}"))?,
    );
    DatabaseManifest::from_file(module.manifest_path())
        .map_err(|error| format!("read claw router database manifest failed: {error}"))?;
    Ok(ClawRouterDatabaseHost { pool, module })
}

/// Runtime-safe bootstrap.
///
/// The manifest defaults `autoMigrate` to `false`, so production startup only
/// loads the module and retains a shared pool. A caller may enable the standard
/// `SDKWORK_CLAW_ROUTER_DATABASE_AUTO_MIGRATE` switch in a guarded development
/// or controlled staging process; release and operator commands should call
/// [`migrate_claw_router_database`] instead.
pub async fn bootstrap_claw_router_database(
    pool: DatabasePool,
) -> Result<ClawRouterDatabaseHost, String> {
    let host = connect_claw_router_database(pool)?;
    let manifest = DatabaseManifest::from_file(host.module.manifest_path())
        .map_err(|error| format!("read claw router database manifest failed: {error}"))?;
    let options = lifecycle_options_from_env("CLAW_ROUTER", &manifest);
    if options.auto_migrate {
        let environment = std::env::var("SDKWORK_CLAW_ROUTER_ENVIRONMENT").unwrap_or_default();
        if production_like_environment(&environment) {
            return Err(
                "production/staging runtime must not auto-migrate the Claw Router database; run the explicit lifecycle migrate command before startup"
                    .to_owned(),
            );
        }
        host.migrate("sdkwork-clawrouter-runtime").await?;
    }
    Ok(host)
}

pub async fn migrate_claw_router_database(
    pool: DatabasePool,
    applied_by: &str,
) -> Result<(ClawRouterDatabaseHost, usize), String> {
    let host = connect_claw_router_database(pool)?;
    let applied = host.migrate(applied_by).await?;
    Ok((host, applied))
}

pub async fn bootstrap_claw_router_database_from_env() -> Result<ClawRouterDatabaseHost, String> {
    let _ = dotenvy::dotenv();
    let config = DatabaseConfig::from_env("CLAW_ROUTER")
        .map_err(|error| format!("read claw router database config failed: {error}"))?;
    let pool = create_pool_from_config(config)
        .await
        .map_err(|error| format!("create claw router database pool failed: {error}"))?;
    bootstrap_claw_router_database(pool).await
}

fn resolve_app_root() -> PathBuf {
    std::env::var("SDKWORK_CLAW_ROUTER_APP_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../..")
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        })
}

fn production_like_environment(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "production" | "prod" | "staging"
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_database_config::{DatabaseEngine, DeploymentMode};

    async fn memory_pool() -> DatabasePool {
        create_pool_from_config(DatabaseConfig {
            engine: DatabaseEngine::Sqlite,
            url: "sqlite::memory:".to_owned(),
            max_connections: 1,
            mode: DeploymentMode::Standalone,
            ..DatabaseConfig::default()
        })
        .await
        .expect("create in-memory database pool")
    }

    #[tokio::test]
    async fn connect_is_side_effect_free() {
        let pool = memory_pool().await;
        let host = connect_claw_router_database(pool).expect("load database host");
        let sqlite = host.pool().as_sqlite().expect("sqlite pool");

        let table_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table'")
                .fetch_one(sqlite)
                .await
                .expect("inspect empty database");

        assert_eq!(0, table_count);
    }

    #[tokio::test]
    async fn explicit_migrate_materializes_schema_and_standard_history() {
        let pool = memory_pool().await;
        let host = connect_claw_router_database(pool).expect("load database host");

        host.migrate("clawrouter-database-host-test")
            .await
            .expect("migrate database");

        let sqlite = host.pool().as_sqlite().expect("sqlite pool");
        for table in [
            "ai_channel",
            "ops_schema_migration_history",
            "ops_seed_history",
            "ops_database_installation_state",
        ] {
            let present: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
            )
            .bind(table)
            .fetch_one(sqlite)
            .await
            .expect("inspect migrated database");
            assert_eq!(1, present, "missing {table}");
        }
    }

    #[test]
    fn production_like_environment_rejects_production_and_staging_aliases() {
        assert!(production_like_environment("production"));
        assert!(production_like_environment(" PROD "));
        assert!(production_like_environment("staging"));
        assert!(!production_like_environment("development"));
        assert!(!production_like_environment("test"));
    }
}
