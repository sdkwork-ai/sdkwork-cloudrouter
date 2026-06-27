use crate::shared::{
    acquire_template_file_lock, copy_sqlite_template_pool, reset_sqlite_template_path,
    sqlite_file_pool, sqlite_template_current, sqlite_template_path, test_database_installer,
    SqliteTemplateKind, INSTALLED_SQLITE_TEMPLATE_LOCK,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::CatalogRefreshOptions;
use sqlx::{query, SqlitePool};
use std::path::Path;

const SCHEMA_SQLITE_TEMPLATE_REVISION: &str = "v12";

pub async fn schema_sqlite_pool() -> SqlitePool {
    let template_path = sqlite_template_path("schema", SCHEMA_SQLITE_TEMPLATE_REVISION);
    ensure_schema_sqlite_template(&template_path).await;
    copy_sqlite_template_pool(&template_path, "schema").await
}

async fn ensure_schema_sqlite_template(template_path: &Path) {
    if sqlite_template_current(template_path, SqliteTemplateKind::SchemaOnly).await {
        return;
    }
    let _guard = INSTALLED_SQLITE_TEMPLATE_LOCK.lock().await;
    let _file_guard = acquire_template_file_lock(template_path).await;
    if sqlite_template_current(template_path, SqliteTemplateKind::SchemaOnly).await {
        return;
    }
    reset_sqlite_template_path(template_path);
    let pool = sqlite_file_pool(template_path).await;
    test_database_installer(pool.clone())
        .refresh_catalog(CatalogRefreshOptions {
            source: "schema_test_template".to_owned(),
            mode: "dry_run".to_owned(),
            vendor_codes: vec!["openai".to_owned()],
            force: false,
            catalog_root: None,
            catalog_version: Some("2026.05.08.1".to_owned()),
        })
        .await
        .unwrap();
    query("VACUUM").execute(&pool).await.unwrap();
    pool.close().await;
}
