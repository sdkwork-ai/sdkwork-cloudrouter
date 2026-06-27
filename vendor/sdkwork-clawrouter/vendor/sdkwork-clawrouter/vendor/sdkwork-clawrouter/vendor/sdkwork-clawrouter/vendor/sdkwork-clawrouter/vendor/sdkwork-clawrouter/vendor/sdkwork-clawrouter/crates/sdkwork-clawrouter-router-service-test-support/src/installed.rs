use crate::shared::{
    acquire_template_file_lock, copy_sqlite_template_pool, reset_sqlite_template_path,
    sqlite_file_pool, sqlite_template_current, sqlite_template_path, test_database_installer,
    SqliteTemplateKind, INSTALLED_SQLITE_TEMPLATE_LOCK,
};
use sqlx::{query, SqlitePool};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const INSTALLED_SQLITE_TEMPLATE_REVISION: &str = "v13";

pub async fn installed_sqlite_pool() -> SqlitePool {
    let template_path = installed_sqlite_template_path();
    ensure_installed_sqlite_template(&template_path).await;
    copy_sqlite_template_pool(&template_path, "installed").await
}

#[derive(Debug, Clone)]
pub struct InstalledSqliteCatalogCopy {
    database_path: PathBuf,
}

impl InstalledSqliteCatalogCopy {
    pub async fn open_pool(&self) -> SqlitePool {
        sqlite_file_pool(&self.database_path).await
    }

    pub fn path(&self) -> &Path {
        &self.database_path
    }
}

pub async fn installed_sqlite_catalog_copy() -> InstalledSqliteCatalogCopy {
    let template_path = installed_sqlite_template_path();
    ensure_installed_sqlite_template(&template_path).await;
    let database_path = installed_sqlite_catalog_copy_path();
    fs::copy(&template_path, &database_path).unwrap_or_else(|error| {
        panic!(
            "failed to copy installed sqlite catalog from {} to {}: {error}",
            template_path.display(),
            database_path.display()
        )
    });
    InstalledSqliteCatalogCopy { database_path }
}

pub(crate) fn installed_sqlite_template_path() -> PathBuf {
    sqlite_template_path("installed", INSTALLED_SQLITE_TEMPLATE_REVISION)
}

pub(crate) async fn ensure_installed_sqlite_template(template_path: &Path) {
    if sqlite_template_current(template_path, SqliteTemplateKind::Installed).await {
        return;
    }
    let _guard = INSTALLED_SQLITE_TEMPLATE_LOCK.lock().await;
    let _file_guard = acquire_template_file_lock(template_path).await;
    if sqlite_template_current(template_path, SqliteTemplateKind::Installed).await {
        return;
    }
    reset_sqlite_template_path(template_path);
    let pool = sqlite_file_pool(template_path).await;
    test_database_installer(pool.clone())
        .ensure_installed()
        .await
        .unwrap();
    query("VACUUM").execute(&pool).await.unwrap();
    pool.close().await;
}

fn installed_sqlite_catalog_copy_path() -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let process_id = std::process::id();
    let mut path = installed_sqlite_template_path()
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("target/test-dbs"));
    fs::create_dir_all(&path).unwrap();
    path.push(format!(
        "sdkwork-clawrouter-router-service-installed-catalog-{process_id}-{nanos}.db"
    ));
    path
}

#[cfg(test)]
mod tests {
    use sqlx::Row;

    #[tokio::test]
    async fn installed_sqlite_catalog_copy_reopens_installed_catalog_state() {
        let database = super::installed_sqlite_catalog_copy().await;
        let pool = database.open_pool().await;

        let model = sqlx::query(
            r#"
            SELECT model, display_name
            FROM ai_model
            WHERE model = 'gpt-5.5-pro'
            LIMIT 1
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!("gpt-5.5-pro", model.get::<String, _>("model"));
        assert_eq!("GPT-5.5 Pro", model.get::<String, _>("display_name"));

        let status: String =
            sqlx::query_scalar("SELECT status FROM system_installation_state WHERE id = 1")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!("installed", status);
        pool.close().await;
    }
}
