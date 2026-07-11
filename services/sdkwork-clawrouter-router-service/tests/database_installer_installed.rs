use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    CatalogRefreshOptions, DatabaseInstaller, InstallationStatus, CURRENT_SCHEMA_VERSION,
};
use sdkwork_clawrouter_router_service_test_support::installed_sqlite_pool;
use sqlx::SqlitePool;

#[derive(Debug, Clone, PartialEq, Eq)]
struct SeedSnapshot {
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
        .with_options(
            sdkwork_clawrouter_router_service_test_support::test_database_install_options(),
        )
        .expect("canonical test database install options")
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

async fn seed_snapshot(pool: &SqlitePool) -> SeedSnapshot {
    SeedSnapshot {
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
async fn installed_sqlite_pool_reports_canonical_installed_state() {
    let pool = installed_sqlite_pool().await;
    let installer = installer(pool.clone());
    let report = installer
        .status_report()
        .await
        .expect("read installed database report");

    assert_eq!(InstallationStatus::Installed, report.status);
    assert_eq!(CURRENT_SCHEMA_VERSION, report.schema_version);
    assert_eq!("test", report.environment);
    assert_eq!("standard", report.seed_profile);
    assert_eq!("bundled", report.catalog_source);
    assert!(!report.external_catalog);
    assert_eq!("succeeded", report.last_catalog_refresh_status);

    for table in [
        "ops_schema_migration_history",
        "ops_seed_history",
        "ops_database_installation_state",
    ] {
        assert!(
            table_exists(&pool, table).await,
            "missing lifecycle table {table}"
        );
    }
    for retired_table in ["system_installation_state", "system_schema_migration"] {
        assert!(
            !table_exists(&pool, retired_table).await,
            "retired table remains: {retired_table}"
        );
    }
}

#[tokio::test]
async fn installed_sqlite_seed_contains_models_pricing_ranking_and_routing_defaults() {
    let pool = installed_sqlite_pool().await;

    let model_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM ai_model WHERE catalog_key = 'openai/gpt-5.5' AND status = 1 AND deleted_at IS NULL",
    )
    .fetch_one(&pool)
    .await
    .expect("read canonical OpenAI model");
    assert_eq!(1, model_count);

    let pricing_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM ai_model_pricing
           WHERE catalog_key = 'openai/gpt-5.5'
             AND billing_meter_code = 'llm_input_token'
             AND status = 1 AND deleted_at IS NULL"#,
    )
    .fetch_one(&pool)
    .await
    .expect("read canonical model pricing");
    assert!(pricing_count > 0);

    let canonical_ranking_key_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM ai_model_rank_snapshot
           WHERE vendor_code = 'openai'
             AND model = 'gpt-5.5'
             AND catalog_key = 'openai/gpt-5.5'
             AND status = 1"#,
    )
    .fetch_one(&pool)
    .await
    .expect("read canonical model ranking");
    assert_eq!(1, canonical_ranking_key_count);

    let api_group_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM ai_resource_group
           WHERE tenant_id = 0 AND organization_id = 0
             AND group_type = 'api_group'
             AND status = 1 AND deleted_at IS NULL
             AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
    )
    .fetch_one(&pool)
    .await
    .expect("count seeded API resource groups");
    assert!(api_group_count >= 2);

    for group_code in ["api.all", "api.openai.codex"] {
        let count: i64 = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM ai_resource_group
               WHERE tenant_id = 0 AND organization_id = 0
                 AND group_code = ? AND group_type = 'api_group'
                 AND status = 1 AND deleted_at IS NULL
                 AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
        )
        .bind(group_code)
        .fetch_one(&pool)
        .await
        .expect("read seeded API resource group");
        assert_eq!(1, count, "missing seeded API resource group {group_code}");
    }

    let default_channel_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM ai_channel
           WHERE tenant_id = 100001 AND organization_id = 0
             AND channel_code = 'openai-default'
             AND provider_code = 'openai'
             AND status = 0 AND deleted_at IS NULL
             AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
    )
    .fetch_one(&pool)
    .await
    .expect("read disabled default channel");
    assert_eq!(1, default_channel_count);

    let default_credential_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM ai_channel_credential cc
           JOIN ai_channel c
             ON c.id = cc.channel_id
            AND c.tenant_id = cc.tenant_id
            AND c.organization_id = cc.organization_id
           WHERE cc.tenant_id = 100001 AND cc.organization_id = 0
             AND cc.channel_code = 'openai-default'
             AND cc.status = 1 AND cc.deleted_at IS NULL
             AND NULLIF(cc.base_url, '') IS NOT NULL
             AND NULLIF(cc.credential_ref, '') IS NOT NULL
             AND c.channel_code = 'openai-default'
             AND c.deleted_at IS NULL
             AND json_extract(cc.metadata, '$.catalogCode') = 'sdkwork-ai-routing'"#,
    )
    .fetch_one(&pool)
    .await
    .expect("read default channel credential");
    assert_eq!(1, default_credential_count);
}

#[tokio::test]
async fn repeated_catalog_refresh_is_idempotent_and_has_no_duplicate_routing_keys() {
    let pool = installed_sqlite_pool().await;
    let installer = installer(pool.clone());
    let before = seed_snapshot(&pool).await;

    let refresh = installer
        .refresh_catalog(CatalogRefreshOptions::default())
        .await
        .expect("repeat catalog and routing seed import");
    assert!(refresh.synced);
    assert_eq!(before, seed_snapshot(&pool).await);

    let duplicate_group_item_keys: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM (
             SELECT resource_group_id, item_type,
                    COALESCE(resource_code, '') AS resource_code,
                    COALESCE(child_resource_group_code, '') AS child_group_code,
                    COUNT(*) AS item_count
             FROM ai_resource_group_item
             WHERE tenant_id = 0 AND organization_id = 0
               AND status = 1 AND deleted_at IS NULL
               AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
             GROUP BY resource_group_id, item_type, resource_code, child_group_code
             HAVING item_count > 1
           )"#,
    )
    .fetch_one(&pool)
    .await
    .expect("check routing group item uniqueness");
    assert_eq!(0, duplicate_group_item_keys);

    let duplicate_channel_keys: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM (
             SELECT tenant_id, organization_id, channel_code, COUNT(*) AS channel_count
             FROM ai_channel
             WHERE tenant_id = 100001 AND organization_id = 0
               AND json_extract(metadata, '$.catalogCode') = 'sdkwork-ai-routing'
               AND deleted_at IS NULL
             GROUP BY tenant_id, organization_id, channel_code
             HAVING channel_count > 1
           )"#,
    )
    .fetch_one(&pool)
    .await
    .expect("check default channel uniqueness");
    assert_eq!(0, duplicate_channel_keys);
}

#[tokio::test]
async fn missing_default_credential_is_restored_by_explicit_bootstrap_without_duplicates() {
    let pool = installed_sqlite_pool().await;
    let installer = installer(pool.clone());
    let before = seed_snapshot(&pool).await;

    sqlx::query(
        r#"UPDATE ai_channel_credential
           SET data_scope = 0,
               status = 0,
               base_url = 'https://invalid.example.test',
               credential_ref = '',
               health_status = 0,
               consecutive_error_count = 9,
               deleted_at = CURRENT_TIMESTAMP
           WHERE tenant_id = 100001 AND organization_id = 0
             AND channel_code = 'openai-default'"#,
    )
    .execute(&pool)
    .await
    .expect("remove the active default credential from the seed projection");

    assert_eq!(
        InstallationStatus::UpgradeRequired,
        installer
            .status()
            .await
            .expect("read incomplete seed status")
    );
    let report = installer
        .ensure_bootstrap_data()
        .await
        .expect("restore missing application seed data");
    assert_eq!(InstallationStatus::Installed, report.status);
    assert!(report.changed);
    assert_eq!(before, seed_snapshot(&pool).await);

    let restored: (i64, i64, String, String, i64, i64, Option<String>) = sqlx::query_as(
        r#"SELECT data_scope, status, base_url, credential_ref, health_status,
                  consecutive_error_count, deleted_at
           FROM ai_channel_credential
           WHERE tenant_id = 100001 AND organization_id = 0
             AND channel_code = 'openai-default'
             AND status = 1 AND deleted_at IS NULL"#,
    )
    .fetch_one(&pool)
    .await
    .expect("read restored default credential");
    assert_eq!(1, restored.0);
    assert_eq!(1, restored.1);
    assert_eq!("https://api.openai.com/v1", restored.2);
    assert_eq!("secret://ai-channel-credentials/openai/default", restored.3);
    assert_eq!(1, restored.4);
    assert_eq!(0, restored.5);
    assert!(restored.6.is_none());
}
