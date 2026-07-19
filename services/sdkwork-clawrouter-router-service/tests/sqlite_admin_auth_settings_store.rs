use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminAuthSettingsStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminAuthSettingsStore, AdminAuthSettingsSubject, GetAdminAuthSettingsQuery,
};
use sdkwork_clawrouter_router_service_test_support::schema_sqlite_pool;

#[tokio::test]
async fn sqlite_admin_auth_settings_store_returns_defaults_without_a_snapshot() {
    let store = SqliteAdminAuthSettingsStore::new(schema_sqlite_pool().await);

    store
        .get_auth_settings(GetAdminAuthSettingsQuery {
            subject: AdminAuthSettingsSubject {
                tenant_id: 100001,
                organization_id: 100002,
                operator_id: 1,
                operator_type: 1,
            },
        })
        .await
        .expect("auth settings should use the canonical ops_config_snapshot schema");
}
