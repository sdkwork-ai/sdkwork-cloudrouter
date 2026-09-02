use std::path::{Path, PathBuf};
use std::sync::Arc;

use sdkwork_database_config::DatabaseConfig;
use sdkwork_database_lifecycle::{
    lifecycle_options_from_env, LifecycleOrchestrator, RegistryLifecycleOrchestrator,
};
use sdkwork_database_spi::{DatabaseModuleRegistry, DefaultDatabaseModule};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};
use sha2::{Digest, Sha256};

pub struct CloudRouterDatabaseHost {
    pool: DatabasePool,
    modules: Vec<Arc<DefaultDatabaseModule>>,
}

impl CloudRouterDatabaseHost {
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
            builder = builder.register(module.as_ref().clone()).map_err(|error| {
                format!("register cloud router database module failed: {error}")
            })?;
        }
        Ok(
            RegistryLifecycleOrchestrator::new(self.pool.clone(), builder.build())
                .with_applied_by(applied_by),
        )
    }

    /// Applies the canonical baseline and all pending migrations.
    ///
    /// This is an explicit release/installer operation. Runtime startup must
    /// use [`connect_cloud_router_database`] unless its guarded development
    /// policy deliberately opts into migration.
    pub async fn migrate(&self, applied_by: &str) -> Result<usize, String> {
        for module in &self.modules {
            self.orchestrator(module.clone(), applied_by)
                .init()
                .await
                .map_err(|error| {
                    format!(
                        "cloud router database module {} init failed: {error}",
                        module.manifest().module_id
                    )
                })?;
        }
        self.registry_orchestrator(applied_by)?
            .migrate_all()
            .await
            .map(|results| results.into_iter().map(|(_, count)| count).sum())
            .map_err(|error| format!("cloud router database migration failed: {error}"))
    }

    pub async fn plan_migrations(&self) -> Result<usize, String> {
        let mut count = 0usize;
        for module in &self.modules {
            count += self
                .orchestrator(module.clone(), "sdkwork-cloudrouter-plan")
                .plan_migrations()
                .await
                .map_err(|error| {
                    format!(
                        "cloud router database module {} migration plan failed: {error}",
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
pub fn connect_cloud_router_database(
    pool: DatabasePool,
) -> Result<CloudRouterDatabaseHost, String> {
    let app_root = resolve_app_root();
    let modules = load_modules(&app_root)?;
    Ok(CloudRouterDatabaseHost { pool, modules })
}

/// Runtime-safe bootstrap.
///
/// The manifest defaults `autoMigrate` to `false`, so production startup only
/// loads the module and retains a shared pool. A caller may enable the standard
/// `SDKWORK_DATABASE_AUTO_MIGRATE` switch in a guarded development
/// or controlled staging process; release and operator commands should call
/// [`migrate_cloud_router_database`] instead — the explicit lifecycle command
/// (`sdkwork-api-cloud-gateway --migrate-databases`, which sets
/// `SDKWORK_DATABASE_LIFECYCLE_COMMAND=migrate`) is admitted by
/// [`explicit_lifecycle_command`]. When
/// `SDKWORK_DATABASE_SEED_ON_BOOT` is enabled, required seed sets are applied
/// through the seed pipeline if not yet recorded for the selected locale/profile
/// (DATABASE_FRAMEWORK_SPEC.md §4.3).
pub async fn bootstrap_cloud_router_database(
    pool: DatabasePool,
) -> Result<CloudRouterDatabaseHost, String> {
    let host = connect_cloud_router_database(pool)?;
    let options = lifecycle_options_from_env("CLOUD_ROUTER", host.module().manifest());
    if options.auto_migrate {
        let environment =
            std::env::var("SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT").unwrap_or_default();
        if production_like_environment(&environment) && !explicit_lifecycle_command() {
            return Err(
                "production/staging runtime must not auto-migrate the Cloud Router database; run the explicit lifecycle migrate command before startup"
                    .to_owned(),
            );
        }
        host.migrate("sdkwork-cloudrouter-runtime").await?;
    }
    if options.seed_on_boot {
        host.orchestrator(host.module().clone(), "sdkwork-cloudrouter-runtime")
            .seed(&options.seed_locale, &options.seed_profile)
            .await
            .map_err(|error| {
                format!(
                    "cloud router database module {} seed failed: {error}",
                    host.module().manifest().module_id
                )
            })?;
    }
    Ok(host)
}

pub async fn migrate_cloud_router_database(
    pool: DatabasePool,
    applied_by: &str,
) -> Result<(CloudRouterDatabaseHost, usize), String> {
    let host = connect_cloud_router_database(pool)?;
    let applied = host.migrate(applied_by).await?;
    Ok((host, applied))
}

pub async fn bootstrap_cloud_router_database_from_env() -> Result<CloudRouterDatabaseHost, String> {
    let _ = dotenvy::dotenv();
    let config = DatabaseConfig::from_env("CLOUD_ROUTER")
        .map_err(|error| format!("read cloud router database config failed: {error}"))?;
    let pool = create_pool_from_config(config)
        .await
        .map_err(|error| format!("create cloud router database pool failed: {error}"))?;
    bootstrap_cloud_router_database(pool).await
}

/// Repairs known development-only migration-history changes introduced by the
/// composable pricing/billing split. These repairs only accept checksums from
/// migration files replaced during that split; arbitrary drift remains a hard
/// lifecycle error.
///
/// Returns `Ok(true)` when the repair was applied, `Ok(false)` when the
/// database is not in that legacy state, and `Err` when the repair attempt
/// itself failed.
pub async fn repair_known_pricing_migration_history(pool: &DatabasePool) -> Result<bool, String> {
    const POSTGRES_ENGINE: &str = "postgres";
    const LEGACY_PRICING_0002_CHECKSUM: &str =
        "7e33bc1320ecb80d40e22dd8f133ef81051d3a6256a98fa07f9d005fa2e0e3ea";
    const LEGACY_BILLING_0002_CHECKSUM: &str =
        "53d2a36ac048aeee016d73d851b05329f3e1f7ef010e1923c487f0cbe2d94f22";

    let postgres = pool
        .as_postgres()
        .ok_or_else(|| "expected PostgreSQL pool".to_owned())?;
    let pricing_checksum: Option<String> = sqlx::query_scalar(
        r#"
        SELECT checksum
        FROM ops_schema_migration_history
        WHERE module_id = $1
          AND version = '0002'
          AND engine = $2
        "#,
    )
    .bind("pricing")
    .bind(POSTGRES_ENGINE)
    .fetch_optional(postgres)
    .await
    .map_err(|error| format!("inspect pricing migration 0002 checksum failed: {error}"))?;

    let billing_checksum: Option<String> = sqlx::query_scalar(
        r#"
        SELECT checksum
        FROM ops_schema_migration_history
        WHERE module_id = $1
          AND version = '0002'
          AND engine = $2
        "#,
    )
    .bind("cloudrouter-billing")
    .bind(POSTGRES_ENGINE)
    .fetch_optional(postgres)
    .await
    .map_err(|error| {
        format!("inspect cloudrouter-billing migration 0002 checksum failed: {error}")
    })?;

    let repair_pricing = pricing_checksum.as_deref() == Some(LEGACY_PRICING_0002_CHECKSUM);
    let repair_billing = billing_checksum.as_deref() == Some(LEGACY_BILLING_0002_CHECKSUM);
    if !repair_pricing && !repair_billing {
        return Ok(false);
    }

    let app_root = resolve_app_root();
    let mut tx = postgres
        .begin()
        .await
        .map_err(|error| format!("begin migration history repair transaction failed: {error}"))?;

    if repair_pricing {
        let migration_root = app_root.join("database/modules/pricing/migrations/postgres");
        let migration_0001 = migration_root.join("0001_pricing_rate_book_dimension_columns.up.sql");
        let migration_0002 = migration_root.join("0002_pricing_integrity_guards.up.sql");
        let checksum_0001 = file_checksum(&migration_0001)?;
        let checksum_0002 = file_checksum(&migration_0002)?;

        sqlx::query(
            r#"
            INSERT INTO ops_schema_migration_history (
                module_id, version, name, engine, checksum, applied_by
            )
            VALUES (
                'pricing', '0001', 'pricing_rate_book_dimension_columns', 'postgres', $1,
                'cloudrouterctl:dev-history-repair'
            )
            ON CONFLICT (module_id, version, engine) DO UPDATE
            SET checksum = EXCLUDED.checksum
            "#,
        )
        .bind(&checksum_0001)
        .execute(&mut *tx)
        .await
        .map_err(|error| format!("record pricing migration 0001 repair failed: {error}"))?;

        update_migration_checksum(&mut tx, "pricing", &checksum_0002).await?;
    }

    if repair_billing {
        let migration = app_root.join(
            "database/modules/cloudrouter-billing/migrations/postgres/0002_pricing_rule_integrity_guards.up.sql",
        );
        let checksum = file_checksum(&migration)?;
        update_migration_checksum(&mut tx, "cloudrouter-billing", &checksum).await?;
    }

    tx.commit()
        .await
        .map_err(|error| format!("commit migration history repair failed: {error}"))?;
    Ok(true)
}

async fn update_migration_checksum(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    module_id: &str,
    checksum: &str,
) -> Result<(), String> {
    let updated = sqlx::query(
        r#"
        UPDATE ops_schema_migration_history
        SET checksum = $1,
            applied_by = COALESCE(applied_by, 'cloudrouterctl:dev-history-repair')
        WHERE module_id = $2
          AND version = '0002'
          AND engine = 'postgres'
        "#,
    )
    .bind(checksum)
    .bind(module_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| format!("update {module_id} migration 0002 repair failed: {error}"))?;

    if updated.rows_affected() == 0 {
        return Err(format!(
            "{module_id} migration 0002 repair found no recorded history row"
        ));
    }
    Ok(())
}

fn resolve_app_root() -> PathBuf {
    std::env::var("SDKWORK_CLOUDROUTER_ROUTER_APP_ROOT")
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
        .map_err(|error| format!("load cloud router root database module failed: {error}"))?;
    let declared_modules = root.manifest().modules.clone();
    let mut modules = Vec::with_capacity(declared_modules.len() + 1);
    modules.push(Arc::new(root));

    for module_id in declared_modules {
        if !valid_module_id(&module_id) {
            return Err(format!(
                "invalid cloud router database module id in root manifest: {module_id}"
            ));
        }
        if modules
            .iter()
            .any(|module| module.manifest().module_id == module_id)
        {
            return Err(format!(
                "duplicate cloud router database module id in root manifest: {module_id}"
            ));
        }

        let module_root = app_root.join("database").join("modules").join(&module_id);
        let module = DefaultDatabaseModule::from_module_root(&module_root).map_err(|error| {
            format!("load cloud router database module {module_id} failed: {error}")
        })?;
        if module.manifest().module_id != module_id {
            return Err(format!(
                "cloud router database module directory {module_id} declares moduleId {}",
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

/// True when this process is the explicit release/operator lifecycle command
/// (for example `sdkwork-api-cloud-gateway --migrate-databases`, which sets
/// `SDKWORK_DATABASE_LIFECYCLE_COMMAND=migrate`). That command is the
/// sanctioned way to migrate production/staging databases before service
/// startup; plain runtime processes never set the marker, so the
/// production/staging auto-migration guard stays fail-closed for them.
fn explicit_lifecycle_command() -> bool {
    matches!(
        std::env::var("SDKWORK_DATABASE_LIFECYCLE_COMMAND")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase()
            .as_str(),
        "migrate" | "migrate-databases" | "explicit" | "operator"
    )
}

fn file_checksum(path: &Path) -> Result<String, String> {
    let bytes = std::fs::read(path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    Ok(hex::encode(Sha256::digest(bytes)))
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

        assert_eq!(
            vec![
                "cloudrouter",
                "gateway-iam",
                "operations",
                "pricing",
                "cloudrouter-billing",
            ],
            module_ids
        );
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
        let host = connect_cloud_router_database(pool).expect("load database host");

        host.migrate("cloudrouter-database-host-postgres-test")
            .await
            .expect("migrate all database modules");

        let postgres = host.pool().as_postgres().expect("PostgreSQL pool");
        for table in [
            "ai_upstream_supplier",
            "ai_chat_conversation",
            "ai_chat_turn",
            "ai_chat_item",
            "ai_chat_message",
            "ai_chat_message_part",
            "ai_chat_context_snapshot",
            "ai_runtime_invocation",
            "ai_runtime_invocation_event",
            "ai_runtime_artifact",
            "ai_runtime_usage_link",
            "iam_gateway_api_key",
            "ops_gateway_instance",
            "pricing_price_book",
            "pricing_rate",
            "cloudrouter_pricing_plan",
            "cloudrouter_usage_measurement",
            "cloudrouter_rating_decision",
            "cloudrouter_charge_line",
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

    #[test]
    fn explicit_lifecycle_command_recognizes_operator_marker_only() {
        // The test process does not set the lifecycle-command marker.
        assert!(!explicit_lifecycle_command());
        unsafe { std::env::set_var("SDKWORK_DATABASE_LIFECYCLE_COMMAND", "migrate") };
        assert!(explicit_lifecycle_command());
        unsafe { std::env::set_var("SDKWORK_DATABASE_LIFECYCLE_COMMAND", " Migrate-Databases ") };
        assert!(explicit_lifecycle_command());
        unsafe { std::env::set_var("SDKWORK_DATABASE_LIFECYCLE_COMMAND", "serve") };
        assert!(!explicit_lifecycle_command());
        unsafe { std::env::remove_var("SDKWORK_DATABASE_LIFECYCLE_COMMAND") };
        assert!(!explicit_lifecycle_command());
    }
}
