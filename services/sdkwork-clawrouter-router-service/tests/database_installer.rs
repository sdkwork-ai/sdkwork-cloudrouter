use sdkwork_clawrouter_database_host::connect_claw_router_database;
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    DatabaseInstaller, InstallationStatus, CURRENT_SCHEMA_VERSION,
};
use sdkwork_clawrouter_router_service_test_support::{
    schema_sqlite_pool, sqlite_memory_pool, test_database_install_options,
};
use sdkwork_database_config::{DatabaseConfig, DatabaseEngine, DeploymentMode};
use sdkwork_database_sqlx::{DatabasePool, PoolContext};
use sqlx::{Row, SqlitePool};

#[derive(Debug, Clone, PartialEq, Eq)]
struct LifecycleSnapshot {
    migration_rows: i64,
    seed_rows: i64,
    installation_rows: i64,
    state: Option<(
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        String,
    )>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SeedSnapshot {
    gateway_instance_rows: i64,
    model_rows: i64,
    pricing_rows: i64,
    ranking_rows: i64,
    endpoint_rows: i64,
    resource_rows: i64,
    resource_group_rows: i64,
    resource_group_item_rows: i64,
    channel_rows: i64,
    credential_rows: i64,
}

fn installer(pool: SqlitePool) -> DatabaseInstaller {
    DatabaseInstaller::for_sqlite(pool)
        .with_options(test_database_install_options())
        .expect("canonical test database install options")
}

fn lifecycle_pool(pool: SqlitePool) -> DatabasePool {
    DatabasePool::Sqlite(
        pool,
        PoolContext {
            config: DatabaseConfig {
                engine: DatabaseEngine::Sqlite,
                url: "sqlite:test-database-installer".to_owned(),
                max_connections: 1,
                mode: DeploymentMode::Standalone,
                ..DatabaseConfig::default()
            },
        },
    )
}

async fn table_exists(pool: &SqlitePool, table: &str) -> bool {
    sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .bind(table)
    .fetch_one(pool)
    .await
    .expect("inspect sqlite table")
        == 1
}

async fn user_table_count(pool: &SqlitePool) -> i64 {
    sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .fetch_one(pool)
    .await
    .expect("count sqlite tables")
}

async fn lifecycle_snapshot(pool: &SqlitePool) -> LifecycleSnapshot {
    let state = sqlx::query(
        r#"
        SELECT module_id, contract_version, seed_locale, seed_profile, status
        FROM ops_database_installation_state
        WHERE module_id = 'clawrouter'
        "#,
    )
    .fetch_optional(pool)
    .await
    .expect("read lifecycle state")
    .map(|row| {
        (
            row.get::<String, _>("module_id"),
            row.get::<Option<String>, _>("contract_version"),
            row.get::<Option<String>, _>("seed_locale"),
            row.get::<Option<String>, _>("seed_profile"),
            row.get::<String, _>("status"),
        )
    });

    LifecycleSnapshot {
        migration_rows: sqlx::query_scalar("SELECT COUNT(*) FROM ops_schema_migration_history")
            .fetch_one(pool)
            .await
            .expect("count migration history"),
        seed_rows: sqlx::query_scalar("SELECT COUNT(*) FROM ops_seed_history")
            .fetch_one(pool)
            .await
            .expect("count seed history"),
        installation_rows: sqlx::query_scalar(
            "SELECT COUNT(*) FROM ops_database_installation_state",
        )
        .fetch_one(pool)
        .await
        .expect("count installation state"),
        state,
    }
}

async fn seed_snapshot(pool: &SqlitePool) -> SeedSnapshot {
    SeedSnapshot {
        gateway_instance_rows: sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ops_gateway_instance
               WHERE tenant_id = 100001 AND organization_id = 0
                 AND instance_code = 'clawrouter-default-standalone'
                 AND deleted_at IS NULL"#,
        )
        .fetch_one(pool)
        .await
        .expect("count default gateway instance rows"),
        model_rows: sqlx::query_scalar(
            "SELECT COUNT(*) FROM ai_model WHERE status = 1 AND deleted_at IS NULL",
        )
        .fetch_one(pool)
        .await
        .expect("count model catalog rows"),
        pricing_rows: sqlx::query_scalar(
            "SELECT COUNT(*) FROM ai_model_pricing WHERE status = 1 AND deleted_at IS NULL",
        )
        .fetch_one(pool)
        .await
        .expect("count pricing catalog rows"),
        ranking_rows: sqlx::query_scalar(
            "SELECT COUNT(*) FROM ai_model_rank_snapshot WHERE status = 1",
        )
        .fetch_one(pool)
        .await
        .expect("count ranking catalog rows"),
        endpoint_rows: sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ai_api_endpoint
               WHERE tenant_id = 0 AND organization_id = 0
                 AND status = 1 AND deleted_at IS NULL
                 AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
        )
        .fetch_one(pool)
        .await
        .expect("count routing endpoint rows"),
        resource_rows: sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ai_resource
               WHERE tenant_id = 0 AND organization_id = 0
                 AND status = 1 AND deleted_at IS NULL
                 AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
        )
        .fetch_one(pool)
        .await
        .expect("count routing resource rows"),
        resource_group_rows: sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ai_resource_group
               WHERE tenant_id = 0 AND organization_id = 0
                 AND status = 1 AND deleted_at IS NULL
                 AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
        )
        .fetch_one(pool)
        .await
        .expect("count routing resource group rows"),
        resource_group_item_rows: sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ai_resource_group_item
               WHERE tenant_id = 0 AND organization_id = 0
                 AND status = 1 AND deleted_at IS NULL
                 AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
        )
        .fetch_one(pool)
        .await
        .expect("count routing resource group item rows"),
        channel_rows: sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ai_channel
               WHERE tenant_id = 100001 AND organization_id = 0
                 AND channel_code = 'openai-default' AND deleted_at IS NULL"#,
        )
        .fetch_one(pool)
        .await
        .expect("count default channel rows"),
        credential_rows: sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ai_channel_credential
               WHERE tenant_id = 100001 AND organization_id = 0
                 AND channel_code = 'openai-default' AND deleted_at IS NULL"#,
        )
        .fetch_one(pool)
        .await
        .expect("count default channel credentials"),
    }
}

#[tokio::test]
async fn empty_database_requires_explicit_schema_migration() {
    let pool = sqlite_memory_pool().await;
    let installer = installer(pool.clone());

    assert_eq!(
        InstallationStatus::NotInstalled,
        installer
            .status()
            .await
            .expect("read empty database status")
    );

    let error = installer
        .ensure_bootstrap_data()
        .await
        .expect_err("bootstrap must fail before schema migration");
    assert!(
        error.to_string().contains("explicit") && error.to_string().contains("migrate"),
        "error must direct operators to the explicit database lifecycle migration: {error}"
    );
    assert_eq!(0, user_table_count(&pool).await);
}

#[tokio::test]
async fn explicit_schema_lifecycle_materializes_standard_history_and_is_idempotent() {
    let pool = schema_sqlite_pool().await;

    for table in [
        "ai_channel",
        "ai_model",
        "ops_schema_migration_history",
        "ops_seed_history",
        "ops_database_installation_state",
    ] {
        assert!(
            table_exists(&pool, table).await,
            "missing canonical table {table}"
        );
    }
    for retired_table in ["system_installation_state", "system_schema_migration"] {
        assert!(
            !table_exists(&pool, retired_table).await,
            "retired table remains: {retired_table}"
        );
    }

    let initial = lifecycle_snapshot(&pool).await;
    let state = initial.state.as_ref().expect("schema migration state row");
    assert_eq!("clawrouter", state.0);
    assert_eq!(Some(CURRENT_SCHEMA_VERSION.to_owned()), state.1);
    assert_eq!(Some(String::new()), state.2);
    assert_eq!(Some(String::new()), state.3);
    assert_eq!("schema_current", state.4);

    let host = connect_claw_router_database(lifecycle_pool(pool.clone()))
        .expect("load Claw Router database lifecycle host");
    let _ = host
        .migrate("database-installer-contract-test")
        .await
        .expect("re-run explicit Claw Router migration");
    let after_first = lifecycle_snapshot(&pool).await;
    let second_applied = host
        .migrate("database-installer-contract-test-repeat")
        .await
        .expect("re-run explicit Claw Router migration a second time");
    let after_second = lifecycle_snapshot(&pool).await;

    assert_eq!(
        0, second_applied,
        "a current schema must have no pending migration"
    );
    assert_eq!(after_first, after_second);
    assert_eq!(initial.migration_rows, after_second.migration_rows);
    assert_eq!(initial.seed_rows, after_second.seed_rows);
    assert_eq!("schema_current", after_second.state.unwrap().4);
}

#[tokio::test]
async fn schema_ready_database_requires_application_bootstrap_and_preserves_lifecycle_history() {
    let pool = schema_sqlite_pool().await;
    let installer = installer(pool.clone());

    assert_eq!(
        InstallationStatus::UpgradeRequired,
        installer.status().await.expect("read schema-only status")
    );
    let before = lifecycle_snapshot(&pool).await;

    let report = installer
        .ensure_bootstrap_data()
        .await
        .expect("bootstrap application catalog and routing seed");
    assert_eq!(InstallationStatus::Installed, report.status);
    assert!(report.changed);
    assert_eq!(CURRENT_SCHEMA_VERSION, report.schema_version);
    assert_eq!("test", report.environment);
    assert_eq!("standard", report.seed_profile);
    assert!(!report.catalog_version.trim().is_empty());
    assert_eq!(before, lifecycle_snapshot(&pool).await);
}

#[tokio::test]
async fn repeated_application_bootstrap_is_a_noop_for_seed_cardinality() {
    let pool = schema_sqlite_pool().await;
    let installer = installer(pool.clone());

    installer
        .ensure_bootstrap_data()
        .await
        .expect("initial application bootstrap");
    let before = seed_snapshot(&pool).await;
    assert_eq!(1, before.gateway_instance_rows);

    let report = installer
        .ensure_bootstrap_data()
        .await
        .expect("repeated application bootstrap");
    assert_eq!(InstallationStatus::Installed, report.status);
    assert!(!report.changed);
    assert_eq!(before, seed_snapshot(&pool).await);
}

#[tokio::test]
async fn bootstrap_fails_closed_when_required_schema_is_missing() {
    let pool = schema_sqlite_pool().await;
    sqlx::query("DROP TABLE ai_channel")
        .execute(&pool)
        .await
        .expect("remove the required schema table for the contract test");

    let installer = installer(pool.clone());
    assert_eq!(
        InstallationStatus::NotInstalled,
        installer
            .status()
            .await
            .expect("read incomplete schema status")
    );
    let error = installer
        .ensure_bootstrap_data()
        .await
        .expect_err("bootstrap must not recreate a missing schema table");
    assert!(error.to_string().contains("explicit"));
    assert!(!table_exists(&pool, "ai_channel").await);
}
