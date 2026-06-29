#![allow(dead_code)]

use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    DatabaseInstallOptions, DatabaseInstaller, CURRENT_SCHEMA_VERSION,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::commerce_bootstrap::commerce_recharge_package_seeds;
use sdkwork_iam_bootstrap::{DEFAULT_IAM_ORGANIZATION_ID, DEFAULT_IAM_TENANT_ID};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use std::ffi::OsString;
use std::fs::{self, File, OpenOptions};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const GENERATED_POSTGRES_SCHEMA: &str =
    include_str!("../../../generated/schema/postgres/schema.sql");
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
    prune_sqlite_test_databases(&template_path);
    let database_path = unique_sqlite_database_path(label);
    fs::copy(&template_path, &database_path).unwrap_or_else(|error| {
        panic!(
            "failed to copy {label} sqlite test template from {} to {}: {error}",
            template_path.display(),
            database_path.display()
        )
    });
    sqlite_file_pool(&database_path).await
}

#[allow(dead_code)]
pub async fn sqlite_memory_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

pub fn test_database_install_options() -> DatabaseInstallOptions {
    DatabaseInstallOptions::new("test", "commercial").unwrap()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum SqliteTemplateKind {
    Installed,
    RepairBaseline,
    SchemaOnly,
}

pub(crate) fn test_database_installer(pool: SqlitePool) -> DatabaseInstaller {
    DatabaseInstaller::for_sqlite(pool)
        .with_options(test_database_install_options())
        .unwrap()
}

pub(crate) fn reset_sqlite_template_path(template_path: &Path) {
    if let Some(parent) = template_path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    if template_path.exists() {
        fs::remove_file(template_path).unwrap();
    }
}

pub(crate) async fn acquire_template_file_lock(template_path: &Path) -> TemplateFileLock {
    let lock_path = template_lock_path(template_path);
    if let Some(parent) = lock_path.parent() {
        fs::create_dir_all(parent).unwrap();
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
                        "timed out waiting for installed sqlite template lock {}",
                        lock_path.display()
                    );
                }
                tokio::time::sleep(template_lock_retry_delay(attempt)).await;
                attempt = attempt.saturating_add(1);
            }
            Err(error) => {
                panic!(
                    "failed to acquire installed sqlite template lock {}: {error}",
                    lock_path.display()
                );
            }
        }
    }
}

pub(crate) fn template_lock_retry_delay(attempt: u32) -> Duration {
    let factor = if attempt >= 63 {
        u64::MAX
    } else {
        1_u64 << attempt
    };
    let millis = SQLITE_TEMPLATE_LOCK_RETRY_INITIAL_MILLIS
        .saturating_mul(factor)
        .min(SQLITE_TEMPLATE_LOCK_RETRY_MAX_MILLIS);
    Duration::from_millis(millis)
}

fn template_lock_path(template_path: &Path) -> PathBuf {
    let mut file_name = template_path
        .file_name()
        .map(OsString::from)
        .unwrap_or_else(|| OsString::from("installed-sqlite-template"));
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
    let current = match kind {
        SqliteTemplateKind::Installed => installed_sqlite_template_state_current(&pool).await,
        SqliteTemplateKind::RepairBaseline => installed_sqlite_template_state_current(&pool).await,
        SqliteTemplateKind::SchemaOnly => schema_sqlite_template_state_current(&pool).await,
    } && sqlite_template_objects_current(&pool).await;
    pool.close().await;
    current
}

pub(crate) async fn installed_sqlite_template_state_current(pool: &SqlitePool) -> bool {
    let expected_catalog_version = match test_database_installer(pool.clone()).catalog_version() {
        Ok(value) => value,
        Err(_) => return false,
    };
    let row = match sqlx::query(
        r#"
        SELECT schema_version, catalog_version, environment, seed_profile, status
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await
    {
        Ok(Some(row)) => row,
        _ => return false,
    };
    row.get::<String, _>("schema_version") == CURRENT_SCHEMA_VERSION
        && row.get::<String, _>("catalog_version") == expected_catalog_version
        && row.get::<String, _>("environment") == "test"
        && row.get::<String, _>("seed_profile") == "commercial"
        && row.get::<String, _>("status") == "installed"
        && installed_sqlite_recharge_catalog_current(pool).await
        && installed_sqlite_ai_routing_admin_groups_current(pool).await
}

async fn installed_sqlite_recharge_catalog_current(pool: &SqlitePool) -> bool {
    let expected = commerce_recharge_package_seeds();
    let total_count: i64 = match sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM commerce_recharge_package
        WHERE tenant_id = ?
          AND organization_id = ?
          AND status <> 'deleted'
        "#,
    )
    .bind(DEFAULT_IAM_TENANT_ID)
    .bind(DEFAULT_IAM_ORGANIZATION_ID)
    .fetch_one(pool)
    .await
    {
        Ok(count) => count,
        Err(_) => return false,
    };
    if total_count != expected.len() as i64 {
        return false;
    }

    for package in expected {
        let status = match sqlx::query_scalar::<_, String>(
            r#"
            SELECT status
            FROM commerce_recharge_package
            WHERE tenant_id = ?
              AND organization_id = ?
              AND package_no = ?
              AND currency_code = ?
            "#,
        )
        .bind(DEFAULT_IAM_TENANT_ID)
        .bind(DEFAULT_IAM_ORGANIZATION_ID)
        .bind(package.package_no)
        .bind(package.currency_code)
        .fetch_optional(pool)
        .await
        {
            Ok(Some(status)) => status,
            _ => return false,
        };
        if status != package.status {
            return false;
        }
    }

    true
}

async fn installed_sqlite_ai_routing_admin_groups_current(pool: &SqlitePool) -> bool {
    let row = match sqlx::query(
        r#"
        SELECT
            g.selection_mode,
            (
                SELECT COUNT(1)
                FROM ai_resource_group_item item
                WHERE item.tenant_id = g.tenant_id
                  AND item.organization_id = g.organization_id
                  AND item.resource_group_id = g.id
                  AND item.status = 1
                  AND item.deleted_at IS NULL
            ) AS active_item_count
        FROM ai_resource_group g
        WHERE g.tenant_id = 0
          AND g.organization_id = 0
          AND g.group_code = 'api.all'
          AND g.group_type = 'api_group'
          AND g.status = 1
          AND g.deleted_at IS NULL
        "#,
    )
    .fetch_optional(pool)
    .await
    {
        Ok(Some(row)) => row,
        _ => return false,
    };
    let api_endpoint_count = match sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM ai_resource
        WHERE tenant_id = 0
          AND organization_id = 0
          AND resource_type = 'api_endpoint'
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => count,
        Err(_) => return false,
    };
    let admin_api_group_count = match sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM ai_resource_group
        WHERE tenant_id = 0
          AND organization_id = 0
          AND group_type = 'api_group'
          AND status = 1
          AND deleted_at IS NULL
          AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
        "#,
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => count,
        Err(_) => return false,
    };
    row.get::<String, _>("selection_mode") == "all"
        && row.get::<i64, _>("active_item_count") == api_endpoint_count
        && admin_api_group_count == 21
}

pub(crate) async fn schema_sqlite_template_state_current(pool: &SqlitePool) -> bool {
    let row = match sqlx::query(
        r#"
        SELECT schema_version, environment, seed_profile, status
        FROM system_installation_state
        WHERE id = 1
        "#,
    )
    .fetch_optional(pool)
    .await
    {
        Ok(Some(row)) => row,
        _ => return false,
    };
    row.get::<String, _>("schema_version") == CURRENT_SCHEMA_VERSION
        && row.get::<String, _>("environment") == "test"
        && row.get::<String, _>("seed_profile") == "commercial"
        && row.get::<String, _>("status") == "installing"
}

pub(crate) async fn sqlite_template_objects_current(pool: &SqlitePool) -> bool {
    let required_schema_objects = [
        ("table", "system_installation_state"),
        ("table", "ai_channel_group_member"),
        ("table", "iam_verification_scene_policy"),
        ("table", "messaging_template"),
        ("table", "platform_app"),
    ];
    for (object_type, name) in required_schema_objects {
        let exists: i64 = match sqlx::query_scalar(
            "SELECT COUNT(1) FROM sqlite_master WHERE type = ? AND name = ?",
        )
        .bind(object_type)
        .bind(name)
        .fetch_one(pool)
        .await
        {
            Ok(exists) => exists,
            Err(_) => return false,
        };
        if exists != 1 {
            return false;
        }
    }
    for (object_type, name) in generated_schema_object_names() {
        let exists: i64 = match sqlx::query_scalar(
            "SELECT COUNT(1) FROM sqlite_master WHERE type = ? AND name = ?",
        )
        .bind(object_type)
        .bind(name.as_str())
        .fetch_one(pool)
        .await
        {
            Ok(exists) => exists,
            Err(_) => return false,
        };
        if exists != 1 {
            return false;
        }
    }
    for (table, column) in required_generated_columns() {
        let pragma = format!("PRAGMA table_info({table})");
        let rows = match sqlx::query(pragma.as_str()).fetch_all(pool).await {
            Ok(rows) => rows,
            Err(_) => return false,
        };
        let exists = rows.into_iter().any(|row| {
            row.try_get::<String, _>("name")
                .map(|name| name.eq_ignore_ascii_case(column))
                .unwrap_or(false)
        });
        if !exists {
            return false;
        }
    }
    true
}

fn required_generated_columns() -> &'static [(&'static str, &'static str)] {
    &[("c_category", "icon_resource_snapshot")]
}

fn generated_schema_object_names() -> Vec<(&'static str, String)> {
    let mut objects = Vec::new();
    for line in GENERATED_POSTGRES_SCHEMA.lines() {
        let line = line.trim();
        let upper = line.to_ascii_uppercase();
        if upper.starts_with("CREATE TABLE IF NOT EXISTS ") {
            if let Some(name) = created_object_name(line, "CREATE TABLE IF NOT EXISTS ") {
                objects.push(("table", name));
            }
        } else if upper.starts_with("CREATE UNIQUE INDEX IF NOT EXISTS ") {
            if let Some(name) = created_object_name(line, "CREATE UNIQUE INDEX IF NOT EXISTS ") {
                objects.push(("index", name));
            }
        } else if upper.starts_with("CREATE INDEX IF NOT EXISTS ") {
            if let Some(name) = created_object_name(line, "CREATE INDEX IF NOT EXISTS ") {
                objects.push(("index", name));
            }
        }
    }
    objects
}

fn created_object_name(statement: &str, prefix: &str) -> Option<String> {
    statement
        .get(prefix.len()..)?
        .trim_start()
        .split(|character: char| character.is_whitespace() || character == '(')
        .next()
        .map(|name| name.trim_matches('"').to_ascii_lowercase())
        .filter(|name| !name.is_empty())
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
            prune_stale_sqlite_template_database(&path, file_name, current_template_label);
            continue;
        }
        if file_name.contains(format!("-{current_process_id}-").as_str()) {
            continue;
        }
        let _ = fs::remove_file(path);
    }
}

fn prune_stale_sqlite_template_database(
    path: &Path,
    _file_name: &str,
    current_template_label: Option<&'static str>,
) {
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

fn sqlite_template_label(path: &Path) -> Option<&'static str> {
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
        "sdkwork-clawrouter-router-service-{label}-{CURRENT_SCHEMA_VERSION}-{revision}.template.db"
    ));
    path
}

fn unique_sqlite_database_path(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let counter = SQLITE_DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let process_id = std::process::id();
    let mut path = sqlite_test_database_dir();
    fs::create_dir_all(&path).unwrap();
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
        fs::create_dir_all(parent).unwrap();
    }
    let database_url = format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"));
    let options = SqliteConnectOptions::from_str(database_url.as_str())
        .unwrap()
        .create_if_missing(true);
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap()
}

pub(crate) async fn sqlite_existing_file_pool(path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let database_url = format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"));
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect(database_url.as_str())
        .await
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
