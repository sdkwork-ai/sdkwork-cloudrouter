use std::ffi::OsString;
use std::fs::{self, File, OpenOptions};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use sdkwork_clawrouter_database_host::connect_claw_router_database;
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    DatabaseInstallOptions, DatabaseInstaller, InstallationStatus,
};
use sdkwork_database_config::{DatabaseConfig, DatabaseEngine, DeploymentMode};
use sdkwork_database_lifecycle::history::execute_sql_script;
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};
use sdkwork_models_database_host::connect_models_database;
use sqlx::{Row, SqlitePool};

const IAM_SQLITE_BASELINE: &str =
    include_str!("../../../../sdkwork-iam/database/ddl/baseline/sqlite/0001_iam_baseline.sql");
const IAM_DEFAULT_SUBJECT_SEED: &str =
    include_str!("../../../../sdkwork-iam/database/seeds/common/002_default_iam_subject.sql");
const SQLITE_TEMPLATE_LOCK_RETRY_INITIAL_MILLIS: u64 = 10;
const SQLITE_TEMPLATE_LOCK_RETRY_MAX_MILLIS: u64 = 100;

static SQLITE_DB_COUNTER: AtomicU64 = AtomicU64::new(0);
pub(crate) static INSTALLED_SQLITE_TEMPLATE_LOCK: tokio::sync::Mutex<()> =
    tokio::sync::Mutex::const_new(());

pub(crate) struct TemplateFileLock {
    path: PathBuf,
    _file: File,
}

impl Drop for TemplateFileLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

pub(crate) async fn copy_sqlite_template_pool(template_path: &Path, label: &str) -> SqlitePool {
    prune_sqlite_test_databases(template_path);
    let database_path = unique_sqlite_database_path(label);
    fs::copy(template_path, &database_path).unwrap_or_else(|error| {
        panic!(
            "failed to copy {label} sqlite test template from {} to {}: {error}",
            template_path.display(),
            database_path.display()
        )
    });
    sqlite_file_pool(&database_path).await
}

pub async fn sqlite_memory_pool() -> SqlitePool {
    standard_sqlite_database_pool("sqlite::memory:", 1)
        .await
        .as_sqlite()
        .expect("standard SQLite pool")
        .clone()
}

pub fn test_database_install_options() -> DatabaseInstallOptions {
    DatabaseInstallOptions::new("test", "standard").expect("canonical test install options")
}

pub(crate) fn test_database_installer(pool: SqlitePool) -> DatabaseInstaller {
    DatabaseInstaller::for_sqlite(pool)
        .with_options(test_database_install_options())
        .expect("canonical test database installer")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum SqliteTemplateKind {
    Installed,
    RepairBaseline,
    SchemaOnly,
}

pub(crate) fn reset_sqlite_template_path(template_path: &Path) {
    if let Some(parent) = template_path.parent() {
        fs::create_dir_all(parent).expect("create SQLite template directory");
    }
    if template_path.exists() {
        fs::remove_file(template_path).expect("remove stale SQLite template");
    }
}

pub(crate) async fn acquire_template_file_lock(template_path: &Path) -> TemplateFileLock {
    let lock_path = template_lock_path(template_path);
    if let Some(parent) = lock_path.parent() {
        fs::create_dir_all(parent).expect("create SQLite template lock directory");
    }
    let started_at = Instant::now();
    let mut attempt = 0_u32;
    loop {
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_path)
        {
            Ok(file) => {
                return TemplateFileLock {
                    path: lock_path,
                    _file: file,
                };
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => {
                if started_at.elapsed() > Duration::from_secs(120) {
                    panic!(
                        "timed out waiting for SQLite template lock {}",
                        lock_path.display()
                    );
                }
                tokio::time::sleep(template_lock_retry_delay(attempt)).await;
                attempt = attempt.saturating_add(1);
            }
            Err(error) => {
                panic!(
                    "failed to acquire SQLite template lock {}: {error}",
                    lock_path.display()
                );
            }
        }
    }
}

pub(crate) fn template_lock_retry_delay(attempt: u32) -> Duration {
    let factor = 1_u64.checked_shl(attempt).unwrap_or(u64::MAX);
    Duration::from_millis(
        SQLITE_TEMPLATE_LOCK_RETRY_INITIAL_MILLIS
            .saturating_mul(factor)
            .min(SQLITE_TEMPLATE_LOCK_RETRY_MAX_MILLIS),
    )
}

fn template_lock_path(template_path: &Path) -> PathBuf {
    let mut file_name = template_path
        .file_name()
        .map(OsString::from)
        .unwrap_or_else(|| OsString::from("sqlite-template"));
    file_name.push(".lock");
    template_path.with_file_name(file_name)
}

pub(crate) async fn sqlite_template_current(
    template_path: &Path,
    kind: SqliteTemplateKind,
) -> bool {
    if !template_path.exists() {
        return false;
    }
    let Ok(pool) = sqlite_existing_file_pool(template_path).await else {
        return false;
    };
    let schema_current = canonical_schema_current(&pool).await;
    let current = match kind {
        SqliteTemplateKind::SchemaOnly => schema_current,
        SqliteTemplateKind::Installed => {
            schema_current
                && matches!(
                    test_database_installer(pool.clone()).status().await,
                    Ok(InstallationStatus::Installed)
                )
        }
        SqliteTemplateKind::RepairBaseline => {
            schema_current
                && matches!(
                    test_database_installer(pool.clone()).status().await,
                    Ok(InstallationStatus::Installed)
                )
                && canonical_iam_subject_current(&pool).await
        }
    };
    pool.close().await;
    current
}

async fn canonical_schema_current(pool: &SqlitePool) -> bool {
    for table in [
        "ai_channel",
        "ai_usage",
        "ai_model",
        "ai_model_pricing",
        "ai_resource",
        "ops_schema_migration_history",
        "ops_seed_history",
        "ops_database_installation_state",
    ] {
        if !sqlite_table_exists(pool, table).await {
            return false;
        }
    }
    for retired_table in ["system_installation_state", "system_schema_migration"] {
        if sqlite_table_exists(pool, retired_table).await {
            return false;
        }
    }
    true
}

async fn canonical_iam_subject_current(pool: &SqlitePool) -> bool {
    let result = sqlx::query(
        r#"
        SELECT t.id AS tenant_id, o.id AS organization_id
        FROM iam_tenant t
        JOIN iam_organization o ON o.tenant_id = t.id
        WHERE t.code = 'SDKWORK'
          AND t.status = 'active'
          AND o.code = 'root'
          AND o.status = 'active'
        "#,
    )
    .fetch_optional(pool)
    .await;
    matches!(
        result,
        Ok(Some(row))
            if row.get::<String, _>("tenant_id") == "100001"
                && row.get::<String, _>("organization_id") == "0"
    )
}

async fn sqlite_table_exists(pool: &SqlitePool, table: &str) -> bool {
    sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .bind(table)
    .fetch_one(pool)
    .await
    .is_ok_and(|count| count == 1)
}

pub(crate) async fn migrate_canonical_test_schema(pool: &SqlitePool) {
    let database_pool = wrap_sqlite_pool(pool.clone(), "sqlite:test-template");

    connect_models_database(database_pool.clone())
        .expect("load sdkwork-models database module")
        .migrate("clawrouter-test-support:models")
        .await
        .expect("migrate sdkwork-models test schema");

    connect_claw_router_database(database_pool)
        .expect("load Claw Router database module")
        .migrate("clawrouter-test-support")
        .await
        .expect("migrate Claw Router test schema");
}

pub(crate) async fn install_canonical_iam_test_subject(pool: &SqlitePool) {
    let database_pool = wrap_sqlite_pool(pool.clone(), "sqlite:test-template");
    execute_sql_script(&database_pool, IAM_SQLITE_BASELINE)
        .await
        .expect("apply canonical IAM SQLite embedded baseline");
    execute_sql_script(&database_pool, IAM_DEFAULT_SUBJECT_SEED)
        .await
        .expect("apply canonical IAM default subject seed");
}

fn wrap_sqlite_pool(pool: SqlitePool, url: &str) -> DatabasePool {
    DatabasePool::Sqlite(
        pool,
        sdkwork_database_sqlx::PoolContext {
            config: sqlite_config(url, 1),
        },
    )
}

fn sqlite_config(url: &str, max_connections: u32) -> DatabaseConfig {
    DatabaseConfig {
        engine: DatabaseEngine::Sqlite,
        url: url.to_owned(),
        max_connections,
        mode: DeploymentMode::Standalone,
        ..DatabaseConfig::default()
    }
}

async fn standard_sqlite_database_pool(url: &str, max_connections: u32) -> DatabasePool {
    create_pool_from_config(sqlite_config(url, max_connections))
        .await
        .expect("create standard SQLite database pool")
}

fn prune_sqlite_test_databases(template_path: &Path) {
    let Some(parent) = template_path.parent() else {
        return;
    };
    let Ok(entries) = fs::read_dir(parent) else {
        return;
    };
    let current_process_id = std::process::id().to_string();
    let current_template_label = sqlite_template_label(template_path);
    for entry in entries.flatten() {
        let path = entry.path();
        if path == template_path || path.extension().and_then(|value| value.to_str()) != Some("db")
        {
            continue;
        }
        let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if !file_name.starts_with("sdkwork-clawrouter-router-service-") {
            continue;
        }
        if file_name.ends_with(".template.db") {
            prune_stale_sqlite_template_database(&path, current_template_label);
            continue;
        }
        if file_name.contains(&format!("-{current_process_id}-")) {
            continue;
        }
        let _ = fs::remove_file(path);
    }
}

fn prune_stale_sqlite_template_database(path: &Path, current_template_label: Option<&str>) {
    let Some(current_template_label) = current_template_label else {
        return;
    };
    if sqlite_template_label(path) != Some(current_template_label) {
        return;
    }
    if template_lock_path(path).exists() {
        return;
    }
    let _ = fs::remove_file(path);
}

fn sqlite_template_label(path: &Path) -> Option<&str> {
    let file_name = path.file_name()?.to_str()?;
    if file_name.starts_with("sdkwork-clawrouter-router-service-installed-") {
        Some("installed")
    } else if file_name.starts_with("sdkwork-clawrouter-router-service-repair-") {
        Some("repair")
    } else if file_name.starts_with("sdkwork-clawrouter-router-service-schema-") {
        Some("schema")
    } else {
        None
    }
}

pub(crate) fn sqlite_template_path(label: &str, revision: &str) -> PathBuf {
    let mut path = sqlite_test_database_dir();
    path.push(format!(
        "sdkwork-clawrouter-router-service-{label}-{revision}.template.db"
    ));
    path
}

fn unique_sqlite_database_path(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock after Unix epoch")
        .as_nanos();
    let counter = SQLITE_DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let process_id = std::process::id();
    let mut path = sqlite_test_database_dir();
    fs::create_dir_all(&path).expect("create SQLite test database directory");
    path.push(format!(
        "sdkwork-clawrouter-router-service-{label}-{process_id}-{nanos}-{counter}.db"
    ));
    path
}

fn sqlite_test_database_dir() -> PathBuf {
    std::env::var_os("CARGO_TARGET_DIR")
        .map(PathBuf::from)
        .map(|path| path.join("sdkwork-clawrouter-router-service-test-dbs"))
        .unwrap_or_else(|| PathBuf::from("target/test-dbs"))
}

pub(crate) async fn sqlite_file_pool(path: &Path) -> SqlitePool {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("create SQLite test database directory");
    }
    let database_url = sqlite_database_url(path);
    standard_sqlite_database_pool(&database_url, 1)
        .await
        .as_sqlite()
        .expect("standard SQLite file pool")
        .clone()
}

async fn sqlite_existing_file_pool(path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let database_url = sqlite_database_url(path);
    let config = sqlite_config(&database_url, 1);
    create_pool_from_config(config)
        .await
        .map_err(|error| sqlx::Error::Configuration(error.to_string().into()))
        .and_then(|pool| {
            pool.as_sqlite()
                .cloned()
                .ok_or_else(|| sqlx::Error::Configuration("expected SQLite database pool".into()))
        })
}

fn sqlite_database_url(path: &Path) -> String {
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::template_lock_retry_delay;
    use std::time::Duration;

    #[test]
    fn installed_sqlite_template_lock_retry_delay_starts_small_and_caps() {
        assert_eq!(Duration::from_millis(10), template_lock_retry_delay(0));
        assert_eq!(Duration::from_millis(20), template_lock_retry_delay(1));
        assert_eq!(Duration::from_millis(40), template_lock_retry_delay(2));
        assert_eq!(Duration::from_millis(80), template_lock_retry_delay(3));
        assert_eq!(Duration::from_millis(100), template_lock_retry_delay(4));
        assert_eq!(Duration::from_millis(100), template_lock_retry_delay(12));
    }
}
