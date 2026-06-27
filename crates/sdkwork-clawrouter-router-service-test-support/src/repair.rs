use crate::installed::{ensure_installed_sqlite_template, installed_sqlite_template_path};
use crate::shared::{
    acquire_template_file_lock, copy_sqlite_template_pool, reset_sqlite_template_path,
    sqlite_file_pool, sqlite_template_current, sqlite_template_path, SqliteTemplateKind,
    INSTALLED_SQLITE_TEMPLATE_LOCK,
};
use sqlx::{query, SqlitePool};
use std::fs;
use std::path::Path;

const REPAIR_SQLITE_TEMPLATE_REVISION: &str = "v14";

pub async fn repair_sqlite_pool() -> SqlitePool {
    let template_path = sqlite_template_path("repair", REPAIR_SQLITE_TEMPLATE_REVISION);
    if !sqlite_template_current(&template_path, SqliteTemplateKind::RepairBaseline).await {
        let installed_template_path = installed_sqlite_template_path();
        ensure_installed_sqlite_template(&installed_template_path).await;
    }
    ensure_repair_sqlite_template(&template_path).await;
    copy_sqlite_template_pool(&template_path, "repair").await
}

async fn ensure_repair_sqlite_template(template_path: &Path) {
    if sqlite_template_current(template_path, SqliteTemplateKind::RepairBaseline).await {
        return;
    }
    let _guard = INSTALLED_SQLITE_TEMPLATE_LOCK.lock().await;
    let _file_guard = acquire_template_file_lock(template_path).await;
    if sqlite_template_current(template_path, SqliteTemplateKind::RepairBaseline).await {
        return;
    }
    reset_sqlite_template_path(template_path);
    let installed_template_path = installed_sqlite_template_path();
    fs::copy(&installed_template_path, template_path).unwrap_or_else(|error| {
        panic!(
            "failed to derive repair sqlite test template from {} to {}: {error}",
            installed_template_path.display(),
            template_path.display()
        )
    });
    let pool = sqlite_file_pool(template_path).await;
    sdkwork_clawrouter_router_service::infrastructure::sql::installer::ensure_sqlite_integration_iam_fixture(
        &pool,
    )
    .await
    .expect("ensure sqlite integration IAM fixture");
    query("VACUUM").execute(&pool).await.unwrap();
    pool.close().await;
}
