use std::path::PathBuf;
use std::sync::Arc;

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_lifecycle::{
    lifecycle_options_from_env, LifecycleOrchestrator, RegistryLifecycleOrchestrator,
};
use sdkwork_database_spi::{DatabaseModuleRegistry, DefaultDatabaseModule};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};

pub struct ClawRouterDatabaseHost {
    pool: DatabasePool,
    modules: Vec<Arc<DefaultDatabaseModule>>,
}

impl ClawRouterDatabaseHost {
    pub fn pool(&self) -> &DatabasePool {
        &self.pool
    }

    pub fn module(&self) -> Arc<DefaultDatabaseModule> {
        self.modules[0].clone()
    }

    pub fn modules(&self) -> &[Arc<DefaultDatabaseModule>] {
        &self.modules
    }

    fn orchestrator(
        &self,
        module: Arc<DefaultDatabaseModule>,
        applied_by: &str,
    ) -> LifecycleOrchestrator {
        LifecycleOrchestrator::new(self.pool.clone(), module).with_applied_by(applied_by)
    }

    fn registry_orchestrator(
        &self,
        applied_by: &str,
    ) -> Result<RegistryLifecycleOrchestrator, String> {
        let mut builder = DatabaseModuleRegistry::builder();
        for module in &self.modules {
            builder = builder
                .register(module.as_ref().clone())
                .map_err(|error| format!("register claw router database module failed: {error}"))?;
        }
        Ok(
            RegistryLifecycleOrchestrator::new(self.pool.clone(), builder.build())
                .with_applied_by(applied_by),
        )
    }

    /// Applies the canonical baseline and all pending migrations.
    ///
    /// This is an explicit release/installer operation. Runtime startup must
    /// use [`connect_claw_router_database`] unless its guarded development
    /// policy deliberately opts into migration.
    pub async fn migrate(&self, applied_by: &str) -> Result<usize, String> {
        for module in &self.modules {
            self.orchestrator(module.clone(), applied_by)
                .init()
                .await
                .map_err(|error| {
                    format!(
                        "claw router database module {} init failed: {error}",
                        module.manifest().module_id
                    )
                })?;
        }
        self.registry_orchestrator(applied_by)?
            .migrate_all()
            .await
            .map(|results| results.into_iter().map(|(_, count)| count).sum())
            .map_err(|error| format!("claw router database migration failed: {error}"))
    }

    pub async fn plan_migrations(&self) -> Result<usize, String> {
        let mut count = 0usize;
        for module in &self.modules {
            count += self
                .orchestrator(module.clone(), "sdkwork-clawrouter-plan")
                .plan_migrations()
                .await
                .map_err(|error| {
                    format!(
                        "claw router database module {} migration plan failed: {error}",
                        module.manifest().module_id
                    )
                })?
                .len();
        }
        Ok(count)
    }
}

/// Loads the canonical database module around an existing pool without
/// creating history tables, applying a baseline, running migrations, or
/// seeding data.
pub fn connect_claw_router_database(pool: DatabasePool) -> Result<ClawRouterDatabaseHost, String> {
    let app_root = resolve_app_root();
    let modules = load_modules(&app_root)?;
    Ok(ClawRouterDatabaseHost { pool, modules })
}

/// Runtime-safe bootstrap.
///
/// The manifest defaults `autoMigrate` to `false`, so production startup only
/// loads the module and retains a shared pool. A caller may enable the standard
/// `SDKWORK_DATABASE_AUTO_MIGRATE` switch in a guarded development
/// or controlled staging process; release and operator commands should call
/// [`migrate_claw_router_database`] instead.
pub async fn bootstrap_claw_router_database(
    pool: DatabasePool,
) -> Result<ClawRouterDatabaseHost, String> {
    let host = connect_claw_router_database(pool)?;
    let options = lifecycle_options_from_env("CLAW_ROUTER", host.module().manifest());
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

fn load_modules(app_root: &std::path::Path) -> Result<Vec<Arc<DefaultDatabaseModule>>, String> {
    let root = DefaultDatabaseModule::from_app_root(app_root)
        .map_err(|error| format!("load claw router root database module failed: {error}"))?;
    let declared_modules = root.manifest().modules.clone();
    let mut modules = Vec::with_capacity(declared_modules.len() + 1);
    modules.push(Arc::new(root));

    for module_id in declared_modules {
        if !valid_module_id(&module_id) {
            return Err(format!(
                "invalid claw router database module id in root manifest: {module_id}"
            ));
        }
        if modules
            .iter()
            .any(|module| module.manifest().module_id == module_id)
        {
            return Err(format!(
                "duplicate claw router database module id in root manifest: {module_id}"
            ));
        }

        let module_root = app_root.join("database").join("modules").join(&module_id);
        let module = DefaultDatabaseModule::from_module_root(&module_root).map_err(|error| {
            format!("load claw router database module {module_id} failed: {error}")
        })?;
        if module.manifest().module_id != module_id {
            return Err(format!(
                "claw router database module directory {module_id} declares moduleId {}",
                module.manifest().module_id
            ));
        }
        modules.push(Arc::new(module));
    }

    Ok(modules)
}

fn valid_module_id(value: &str) -> bool {
    !value.is_empty()
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'-' | b'_')
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

    #[test]
    fn loads_declared_modules_in_manifest_order() {
        let modules = load_modules(&resolve_app_root()).expect("load database modules");
        let module_ids = modules
            .iter()
            .map(|module| module.manifest().module_id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(vec!["clawrouter", "gateway-iam", "operations"], module_ids);
        assert!(modules.iter().all(|module| {
            module.manifest().engines.as_slice() == ["postgres"]
                && module.manifest().default_engine.as_deref() == Some("postgres")
        }));
    }

    #[test]
    fn module_ids_cannot_escape_the_modules_directory() {
        assert!(valid_module_id("gateway-iam"));
        assert!(!valid_module_id("../gateway-iam"));
        assert!(!valid_module_id("GatewayIam"));
        assert!(!valid_module_id(""));
    }

    #[tokio::test]
    #[ignore = "requires SDKWORK_DATABASE_URL pointing to disposable PostgreSQL"]
    async fn postgres_registry_migrates_all_declared_modules() {
        let database_url = std::env::var("SDKWORK_DATABASE_URL").expect("SDKWORK_DATABASE_URL");
        let pool = create_pool_from_config(DatabaseConfig {
            engine: DatabaseEngine::Postgres,
            url: database_url,
            max_connections: 4,
            mode: DeploymentMode::Standalone,
            ..DatabaseConfig::default()
        })
        .await
        .expect("connect disposable PostgreSQL database");
        let host = connect_claw_router_database(pool).expect("load database host");

        host.migrate("clawrouter-database-host-postgres-test")
            .await
            .expect("migrate all database modules");

        let postgres = host.pool().as_postgres().expect("PostgreSQL pool");
        for table in [
            "ai_upstream_supplier",
            "iam_gateway_api_key",
            "ops_gateway_instance",
        ] {
            let present: bool = sqlx::query_scalar("SELECT to_regclass($1) IS NOT NULL")
                .bind(table)
                .fetch_one(postgres)
                .await
                .expect("inspect migrated table");
            assert!(present, "missing {table}");
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
