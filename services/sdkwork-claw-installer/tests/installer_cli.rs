use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Output};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::Value;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};

const CLAW_ROUTER_TABLE_REGISTRY: &str =
    include_str!("../../../database/contract/table-registry.json");
const MODELS_TABLE_REGISTRY: &str =
    include_str!("../../../../sdkwork-models/database/contract/table-registry.json");
const STANDARD_HISTORY_TABLES: [&str; 3] = [
    "ops_schema_migration_history",
    "ops_seed_history",
    "ops_database_installation_state",
];
const RETIRED_INSTALLER_TABLES: [&str; 2] =
    ["system_installation_state", "system_schema_migration"];

static DB_COUNTER: AtomicU64 = AtomicU64::new(0);

#[tokio::test]
async fn status_and_refresh_are_schema_side_effect_free() {
    let database = SqliteDatabase::new("read-only-status");

    let status = run_installer(&database, &["status"]);
    assert_command_succeeded(&status, "status");
    let status_payload = stdout_json(&status);
    assert_eq!("not_installed", status_payload["status"]);
    assert_eq!(
        "schema_not_ready",
        status_payload["lastCatalogRefreshStatus"]
    );
    assert_eq!("bundled", status_payload["catalogSource"]);
    assert_eq!("test", status_payload["environment"]);
    assert_eq!("standard", status_payload["seedProfile"]);
    assert_eq!(false, status_payload["changed"]);

    let pool = connect_existing_sqlite(&database).await;
    assert_eq!(
        0,
        user_table_names(&pool).await.len(),
        "status must not create lifecycle, application, or model tables"
    );
    pool.close().await;

    let refresh = run_installer(
        &database,
        &["refresh-catalog", "--vendor", "openai", "--dry-run"],
    );
    assert!(!refresh.status.success());
    let refresh_payload = stderr_json(&refresh);
    assert_eq!("error", refresh_payload["status"]);
    assert_eq!("invalid_state", refresh_payload["errorCode"]);
    assert!(refresh_payload["message"]
        .as_str()
        .is_some_and(|message| message.contains(
            "run the explicit sdkwork-clawrouter-database-host lifecycle migrate operation"
        )));

    let pool = connect_existing_sqlite(&database).await;
    assert_eq!(
        0,
        user_table_names(&pool).await.len(),
        "refresh-catalog must not implicitly migrate an empty database"
    );
    pool.close().await;
}

#[tokio::test]
async fn reset_admin_requires_password_env_and_rejects_short_password() {
    let database = SqliteDatabase::new("reset-admin-no-password");
    let ensure = run_installer(&database, &["ensure"]);
    assert_command_succeeded(&ensure, "ensure before reset-admin");

    let no_password = run_installer_with_env(
        &database,
        &["reset-admin", "--username", "admin"],
        &[],
    );
    assert!(!no_password.status.success());
    let no_password_payload = stderr_json(&no_password);
    assert_eq!("error", no_password_payload["status"]);
    assert_eq!("invalid_argument", no_password_payload["errorCode"]);

    let short_password = run_installer_with_env(
        &database,
        &["reset-admin", "--username", "admin"],
        &[("SDKWORK_CLAW_ADMIN_RESET_PASSWORD", "short")],
    );
    assert!(!short_password.status.success());
    let short_payload = stderr_json(&short_password);
    assert_eq!("error", short_payload["status"]);
    assert_eq!("invalid_argument", short_payload["errorCode"]);
}

#[tokio::test]
async fn reset_admin_fails_when_bootstrap_admin_missing() {
    let database = SqliteDatabase::new("reset-admin-missing-admin");
    let ensure = run_installer(&database, &["ensure"]);
    assert_command_succeeded(&ensure, "ensure before reset-admin");

    let pool = connect_existing_sqlite(&database).await;
    ensure_iam_tables_sqlite(&pool).await;
    pool.close().await;

    let reset = run_installer_with_env(
        &database,
        &["reset-admin", "--username", "admin"],
        &[("SDKWORK_CLAW_ADMIN_RESET_PASSWORD", "Admin-Reset-2026!")],
    );
    assert!(!reset.status.success());
    let payload = stderr_json(&reset);
    assert_eq!("error", payload["status"]);
    assert_eq!("invalid_state", payload["errorCode"]);
    let message = payload["message"]
        .as_str()
        .expect("missing admin error message");
    assert!(
        message.contains("bootstrap admin user not found"),
        "expected admin-not-found message, got: {message}"
    );
}

#[tokio::test]
async fn reset_admin_resets_bootstrap_admin_password() {
    let database = SqliteDatabase::new("reset-admin-success");
    let ensure = run_installer(&database, &["ensure"]);
    assert_command_succeeded(&ensure, "ensure before reset-admin");

    let pool = connect_existing_sqlite(&database).await;
    ensure_iam_tables_sqlite(&pool).await;
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_user (id, tenant_id, username, display_name, email, phone, \
         email_verified, phone_verified, status, is_deleted, created_at, updated_at) \
         VALUES ('1', '100001', 'admin', 'Administrator', 'admin@sdkwork.com', NULL, \
         1, 0, 'active', 0, ?, ?)",
    )
    .bind(&now)
    .bind(&now)
    .execute(&pool)
    .await
    .expect("insert test iam_user");
    sqlx::query(
        "INSERT INTO iam_credential (id, tenant_id, user_id, credential_type, credential_hash, \
         failed_attempts, status, created_at, updated_at) \
         VALUES ('iamc_bootstrap_1', '100001', '1', 'password', 'old-hash', 3, 'active', ?, ?)",
    )
    .bind(&now)
    .bind(&now)
    .execute(&pool)
    .await
    .expect("insert test iam_credential");
    pool.close().await;

    let reset = run_installer_with_env(
        &database,
        &[
            "reset-admin",
            "--username",
            "admin",
            "--display-name",
            "Administrator",
            "--email",
            "admin@sdkwork.com",
        ],
        &[("SDKWORK_CLAW_ADMIN_RESET_PASSWORD", "Admin-Reset-2026!")],
    );
    assert_command_succeeded(&reset, "reset-admin");
    let payload = stdout_json(&reset);
    assert_eq!("reset", payload["status"]);
    assert_eq!("1", payload["userId"]);
    assert_eq!("100001", payload["tenantId"]);
    assert_eq!("admin", payload["username"]);

    let pool = connect_existing_sqlite(&database).await;
    let row: (String, i64, String) = sqlx::query_as(
        "SELECT credential_hash, failed_attempts, status FROM iam_credential \
         WHERE tenant_id = '100001' AND user_id = '1' AND credential_type = 'password'",
    )
    .fetch_one(&pool)
    .await
    .expect("read reset credential");
    assert_ne!("old-hash", row.0, "credential hash must be updated");
    assert!(row.0.starts_with("$argon2"), "hash must be Argon2");
    assert_eq!(0, row.1, "failed_attempts must be reset to 0");
    assert_eq!("active", row.2, "status must remain active");
    pool.close().await;
}

#[tokio::test]
async fn ensure_migrates_models_then_claw_router_and_bootstraps_routing_idempotently() {
    let database = SqliteDatabase::new("ensure-lifecycle");

    let first = run_installer(&database, &["ensure"]);
    assert_command_succeeded(&first, "first ensure");
    let first_payload = stdout_json(&first);
    assert_eq!("installed", first_payload["status"]);
    assert_eq!("succeeded", first_payload["lastCatalogRefreshStatus"]);
    assert_eq!("test", first_payload["environment"]);
    assert_eq!("standard", first_payload["seedProfile"]);
    assert_eq!(true, first_payload["changed"]);
    assert!(
        first_payload.get("bootstrapAdmin").is_none(),
        "Claw Router lifecycle must not expose IAM bootstrap capabilities"
    );

    let pool = connect_existing_sqlite(&database).await;
    assert_canonical_schema(&pool).await;
    assert_canonical_routing_seed(&pool).await;
    pool.close().await;

    let second = run_installer(&database, &["ensure"]);
    assert_command_succeeded(&second, "second ensure");
    let second_payload = stdout_json(&second);
    assert_eq!("installed", second_payload["status"]);
    assert_eq!("succeeded", second_payload["lastCatalogRefreshStatus"]);
    assert_eq!(false, second_payload["changed"]);
    assert!(second_payload.get("bootstrapAdmin").is_none());

    let pool = connect_existing_sqlite(&database).await;
    assert_canonical_schema(&pool).await;
    assert_canonical_routing_seed(&pool).await;
    pool.close().await;
}

#[tokio::test]
async fn refresh_catalog_supports_vendor_scope_and_dry_run_without_mutating_catalog_facts() {
    let database = SqliteDatabase::new("catalog-refresh");

    let ensure = run_installer(&database, &["ensure"]);
    assert_command_succeeded(&ensure, "ensure before refresh");

    let refresh = run_installer(&database, &["refresh-catalog", "--vendor", "openai"]);
    assert_command_succeeded(&refresh, "OpenAI catalog refresh");
    let refresh_payload = stdout_json(&refresh);
    assert_eq!("refreshed_catalog", refresh_payload["status"]);
    assert_eq!(true, refresh_payload["synced"]);
    assert_eq!("installed", refresh_payload["installationStatus"]);
    assert_eq!("vendor_refresh", refresh_payload["mode"]);
    assert_eq!(
        serde_json::json!(["openai"]),
        refresh_payload["vendorCodes"]
    );
    assert_eq!(1, refresh_payload["vendorCount"]);
    assert!(refresh_payload["modelCount"]
        .as_u64()
        .is_some_and(|count| count > 0));
    assert!(refresh_payload["priceCount"]
        .as_u64()
        .is_some_and(|count| count > 0));
    assert!(refresh_payload["acceptedCount"]
        .as_i64()
        .is_some_and(|count| count > 0));
    assert_eq!("succeeded", refresh_payload["lastCatalogRefreshStatus"]);

    let pool = connect_existing_sqlite(&database).await;
    let before_dry_run = openai_catalog_fact_counts(&pool).await;
    pool.close().await;

    let dry_run = run_installer(
        &database,
        &["refresh-catalog", "--vendor", "openai", "--dry-run"],
    );
    assert_command_succeeded(&dry_run, "OpenAI catalog dry-run");
    let dry_run_payload = stdout_json(&dry_run);
    assert_eq!("catalog_refresh_dry_run", dry_run_payload["status"]);
    assert_eq!(false, dry_run_payload["synced"]);
    assert_eq!("installed", dry_run_payload["installationStatus"]);
    assert_eq!("dry_run", dry_run_payload["mode"]);
    assert_eq!(
        serde_json::json!(["openai"]),
        dry_run_payload["vendorCodes"]
    );
    assert_eq!(1, dry_run_payload["vendorCount"]);
    assert_eq!("succeeded", dry_run_payload["lastCatalogRefreshStatus"]);

    let pool = connect_existing_sqlite(&database).await;
    let after_dry_run = openai_catalog_fact_counts(&pool).await;
    assert_eq!(
        before_dry_run, after_dry_run,
        "dry-run must not mutate vendor, model, or pricing facts"
    );
    assert_canonical_routing_seed(&pool).await;
    pool.close().await;
}

async fn assert_canonical_schema(pool: &SqlitePool) {
    let claw_router_tables = registry_table_names(CLAW_ROUTER_TABLE_REGISTRY);
    let model_tables = registry_table_names(MODELS_TABLE_REGISTRY);
    assert_eq!(43, claw_router_tables.len(), "Claw Router registry drift");
    assert_eq!(22, model_tables.len(), "sdkwork-models registry drift");
    assert!(claw_router_tables.is_disjoint(&model_tables));

    let mut expected = claw_router_tables;
    expected.extend(model_tables);
    expected.extend(
        STANDARD_HISTORY_TABLES
            .iter()
            .map(|name| (*name).to_owned()),
    );

    let actual = user_table_names(pool).await;
    assert_eq!(
        expected, actual,
        "installed SQLite schema must match both owning registries plus standard lifecycle history"
    );

    for table in STANDARD_HISTORY_TABLES {
        assert!(
            table_exists(pool, table).await,
            "missing standard history table {table}"
        );
    }
    for table in RETIRED_INSTALLER_TABLES {
        assert!(
            !table_exists(pool, table).await,
            "retired installer table {table} must not be recreated"
        );
    }

    let installation_state_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ops_database_installation_state WHERE module_id = 'clawrouter' AND status = 'schema_current'",
    )
    .fetch_one(pool)
    .await
    .expect("read standard installation state");
    assert_eq!(1, installation_state_count);
}

async fn assert_canonical_routing_seed(pool: &SqlitePool) {
    let channel = sqlx::query(
        r#"
        SELECT id, provider_code, channel_type, protocol_code, base_url, status
        FROM ai_channel
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_code = 'openai-default'
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(pool)
    .await
    .expect("default OpenAI channel seed");
    let channel_id = channel.get::<i64, _>("id");
    assert_eq!("openai", channel.get::<String, _>("provider_code"));
    assert_eq!("official", channel.get::<String, _>("channel_type"));
    assert_eq!(
        "openai_compatible",
        channel.get::<String, _>("protocol_code")
    );
    assert_eq!(
        "https://api.openai.com/v1",
        channel.get::<String, _>("base_url")
    );
    assert_eq!(
        0,
        channel.get::<i32, _>("status"),
        "placeholder-backed default channel must remain disabled until an operator configures its secret"
    );

    let credential_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ai_channel_credential
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_id = ?
          AND channel_code = 'openai-default'
          AND credential_ref = 'secret://ai-channel-credentials/openai/default'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(channel_id)
    .fetch_one(pool)
    .await
    .expect("default OpenAI credential reference seed");
    assert_eq!(1, credential_count);

    let channel_group_id: i64 = sqlx::query_scalar(
        r#"
        SELECT id
        FROM ai_channel_group
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND group_code = 'standard-group'
          AND provider_code = 'openai'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(pool)
    .await
    .expect("default standard channel group seed");

    let member_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ai_channel_group_member
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_group_id = ?
          AND channel_id = ?
          AND enabled = 1
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(channel_group_id)
    .bind(channel_id)
    .fetch_one(pool)
    .await
    .expect("default channel group membership seed");
    assert_eq!(1, member_count);

    let official_openai_resource_group_id: i64 = sqlx::query_scalar(
        r#"
        SELECT id
        FROM ai_resource_group
        WHERE tenant_id = 0
          AND organization_id = 0
          AND group_code = 'official.openai.full'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(pool)
    .await
    .expect("official OpenAI resource group seed");

    let resource_binding_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ai_channel_group_resource
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_group_id = ?
          AND resource_group_id = ?
          AND resource_group_code = 'official.openai.full'
          AND grant_type = 'allow'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(channel_group_id)
    .bind(official_openai_resource_group_id)
    .fetch_one(pool)
    .await
    .expect("default channel group resource binding seed");
    assert_eq!(1, resource_binding_count);

    let openai_vendor_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_model_vendor WHERE vendor_code = 'openai' AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .expect("OpenAI vendor catalog seed");
    assert_eq!(1, openai_vendor_count);

    let openai_model_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_model WHERE vendor_code = 'openai' AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .expect("OpenAI model catalog seed");
    assert!(openai_model_count > 0);

    let openai_pricing_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_model_pricing WHERE vendor_code = 'openai' AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .expect("OpenAI pricing catalog seed");
    assert!(openai_pricing_count > 0);
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CatalogFactCounts {
    vendors: i64,
    models: i64,
    prices: i64,
}

async fn openai_catalog_fact_counts(pool: &SqlitePool) -> CatalogFactCounts {
    let vendors = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_model_vendor WHERE vendor_code = 'openai' AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .expect("count OpenAI vendors");
    let models = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_model WHERE vendor_code = 'openai' AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .expect("count OpenAI models");
    let prices = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_model_pricing WHERE vendor_code = 'openai' AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(pool)
    .await
    .expect("count OpenAI prices");
    CatalogFactCounts {
        vendors,
        models,
        prices,
    }
}

fn registry_table_names(payload: &str) -> BTreeSet<String> {
    let registry: Value = serde_json::from_str(payload).expect("parse table registry");
    registry["tables"]
        .as_array()
        .expect("table registry items")
        .iter()
        .map(|table| {
            table["table_name"]
                .as_str()
                .expect("registry table_name")
                .to_owned()
        })
        .collect()
}

async fn user_table_names(pool: &SqlitePool) -> BTreeSet<String> {
    sqlx::query_scalar::<_, String>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .fetch_all(pool)
    .await
    .expect("inspect SQLite tables")
    .into_iter()
    .collect()
}

async fn table_exists(pool: &SqlitePool, table: &str) -> bool {
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?")
            .bind(table)
            .fetch_one(pool)
            .await
            .expect("inspect SQLite table");
    count == 1
}

async fn connect_existing_sqlite(database: &SqliteDatabase) -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database.url)
        .await
        .expect("connect to installer SQLite database")
}

/// Create the minimal IAM tables (`iam_user`, `iam_credential`,
/// `iam_organization_membership`) that the claw router installer lifecycle does not
/// migrate. This simulates the state where the IAM service has already initialized its
/// schema, which is required before `reset-admin` can run.
async fn ensure_iam_tables_sqlite(pool: &SqlitePool) {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS iam_user (\
         id TEXT PRIMARY KEY,\
         tenant_id TEXT NOT NULL,\
         username TEXT NOT NULL,\
         display_name TEXT NOT NULL,\
         email TEXT,\
         phone TEXT,\
         status TEXT NOT NULL,\
         created_at TEXT NOT NULL,\
         updated_at TEXT NOT NULL,\
         email_verified INTEGER NOT NULL DEFAULT 0,\
         phone_verified INTEGER NOT NULL DEFAULT 0,\
         is_deleted INTEGER NOT NULL DEFAULT 0,\
         UNIQUE (tenant_id, username))",
    )
    .execute(pool)
    .await
    .expect("create test iam_user table");
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS iam_credential (\
         id TEXT PRIMARY KEY,\
         tenant_id TEXT NOT NULL,\
         user_id TEXT NOT NULL,\
         credential_type TEXT NOT NULL,\
         credential_hash TEXT NOT NULL,\
         status TEXT NOT NULL,\
         expires_at TEXT,\
         created_at TEXT NOT NULL,\
         updated_at TEXT NOT NULL,\
         failed_attempts INTEGER NOT NULL DEFAULT 0)",
    )
    .execute(pool)
    .await
    .expect("create test iam_credential table");
    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS iam_credential_tenant_user_type_unique \
         ON iam_credential (tenant_id, user_id, credential_type)",
    )
    .execute(pool)
    .await
    .expect("create test iam_credential unique index");
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS iam_organization_membership (\
         id TEXT PRIMARY KEY,\
         tenant_id TEXT NOT NULL,\
         organization_id TEXT NOT NULL,\
         user_id TEXT NOT NULL,\
         membership_kind TEXT NOT NULL,\
         is_primary INTEGER NOT NULL DEFAULT 0,\
         status TEXT NOT NULL,\
         joined_at TEXT NOT NULL,\
         created_at TEXT NOT NULL,\
         updated_at TEXT NOT NULL)",
    )
    .execute(pool)
    .await
    .expect("create test iam_organization_membership table");
}

fn run_installer(database: &SqliteDatabase, args: &[&str]) -> Output {
    run_installer_with_env(database, args, &[])
}

fn run_installer_with_env(
    database: &SqliteDatabase,
    args: &[&str],
    extra_env: &[(&str, &str)],
) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_clawrouterctl"));
    command
        .args(args)
        .env("SDKWORK_CLAW_DATABASE_URL", &database.url)
        .env("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", "1")
        .env("SDKWORK_CLAW_ROUTER_ENVIRONMENT", "test")
        .env("SDKWORK_CLAW_ROUTER_DATABASE_SEED_PROFILE", "standard")
        .env_remove("SDKWORK_CLAW_CONFIG_FILE")
        .env_remove("SDKWORK_CLAW_DEPLOYMENT_MODE")
        .env_remove("SDKWORK_MODELS_CATALOG_ROOT")
        .env_remove("SDKWORK_CLAW_ROUTER_DATABASE_AUTO_MIGRATE")
        .env_remove("SDKWORK_CLAW_ADMIN_RESET_PASSWORD")
        .env_remove("SDKWORK_IAM_SUPER_ADMIN_PASSWORD")
        .env_remove("SDKWORK_IAM_BOOTSTRAP_PASSWORD")
        .env_remove("SDKWORK_IAM_MANAGER_PASSWORD");
    for (key, value) in extra_env {
        command.env(key, value);
    }
    command.output().expect("run clawrouterctl")
}

fn assert_command_succeeded(output: &Output, command: &str) {
    assert!(
        output.status.success(),
        "{command} failed with stdout={} stderr={}",
        output_text(&output.stdout),
        output_text(&output.stderr)
    );
}

fn stdout_json(output: &Output) -> Value {
    serde_json::from_slice(&output.stdout).unwrap_or_else(|error| {
        panic!(
            "stdout is not JSON: {error}; stdout={} stderr={}",
            output_text(&output.stdout),
            output_text(&output.stderr)
        )
    })
}

fn stderr_json(output: &Output) -> Value {
    serde_json::from_slice(&output.stderr).unwrap_or_else(|error| {
        panic!(
            "stderr is not JSON: {error}; stdout={} stderr={}",
            output_text(&output.stdout),
            output_text(&output.stderr)
        )
    })
}

fn output_text(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).trim().to_owned()
}

struct SqliteDatabase {
    path: PathBuf,
    url: String,
}

impl SqliteDatabase {
    fn new(label: &str) -> Self {
        let millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock")
            .as_millis();
        let counter = DB_COUNTER.fetch_add(1, Ordering::Relaxed);
        let mut path = std::env::temp_dir();
        path.push(format!(
            "sdkwork-claw-installer-{label}-{millis}-{counter}.sqlite"
        ));
        let url = format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"));
        Self { path, url }
    }
}

impl Drop for SqliteDatabase {
    fn drop(&mut self) {
        for path in [
            self.path.clone(),
            PathBuf::from(format!("{}-shm", self.path.display())),
            PathBuf::from(format!("{}-wal", self.path.display())),
        ] {
            if let Err(error) = fs::remove_file(&path) {
                if error.kind() != std::io::ErrorKind::NotFound {
                    eprintln!("failed to remove test database {}: {error}", path.display());
                }
            }
        }
    }
}
