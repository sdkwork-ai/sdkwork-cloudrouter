use crate::shared::{
    acquire_template_file_lock, copy_sqlite_template_pool, migrate_canonical_test_schema,
    reset_sqlite_template_path, sqlite_file_pool, sqlite_template_current, sqlite_template_path,
    SqliteTemplateKind, INSTALLED_SQLITE_TEMPLATE_LOCK,
};
use sqlx::{query, SqlitePool};
use std::path::Path;

const SCHEMA_SQLITE_TEMPLATE_REVISION: &str = "canonical-v1";

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
    migrate_canonical_test_schema(&pool).await;
    query("VACUUM")
        .execute(&pool)
        .await
        .expect("compact canonical schema template");
    pool.close().await;
}
