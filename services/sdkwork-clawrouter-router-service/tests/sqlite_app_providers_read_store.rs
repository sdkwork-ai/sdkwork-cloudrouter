use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAppProvidersReadStore;
use sdkwork_clawrouter_router_service::ports::{
    AppProvidersListQuery, AppProvidersReadStore, AppProvidersSubject,
};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

#[tokio::test]
async fn sqlite_app_providers_loads_provider_family_and_canonical_integration_type() {
    let pool = sqlite_pool().await;
    create_provider_tables(&pool).await;
    seed_providers(&pool).await;

    let store = SqliteAppProvidersReadStore::new(pool);
    let page = store
        .load_providers(Some(owner_subject()), list_query())
        .await
        .unwrap();
    assert_eq!(2, page.total);
    assert_eq!(1, page.page_no);
    assert_eq!(20, page.page_size);
    let items = page.items;

    assert_eq!(2, items.len());

    let azure = items
        .iter()
        .find(|item| item.id == "1")
        .expect("azure provider should be returned");
    assert_eq!("codex", azure.provider_family);
    assert_eq!("cloud_platform", azure.integration_type);
    assert_eq!("active", azure.status);

    let relay = items
        .iter()
        .find(|item| item.id == "2")
        .expect("relay provider should be returned");
    assert_eq!("opencode", relay.provider_family);
    assert_eq!("relay_aggregator", relay.integration_type);
    assert_eq!("active", relay.status);
}

#[tokio::test]
async fn sqlite_app_providers_counts_model_resources_as_active() {
    let pool = sqlite_pool().await;
    create_provider_tables(&pool).await;
    seed_provider_with_type(&pool, 2).await;

    let store = SqliteAppProvidersReadStore::new(pool);
    let page = store
        .load_providers(Some(owner_subject()), list_query())
        .await
        .unwrap();
    assert_eq!(1, page.total);
    let items = page.items;

    assert_eq!(1, items.len());
    assert_eq!("active", items[0].status);
    assert_eq!("https://azure.example.test/openai", items[0].url);
}

#[tokio::test]
async fn sqlite_app_providers_rejects_unknown_integration_type_code() {
    let pool = sqlite_pool().await;
    create_provider_tables(&pool).await;
    seed_provider_with_type(&pool, 99).await;

    let store = SqliteAppProvidersReadStore::new(pool);
    let error = store
        .load_providers(Some(owner_subject()), list_query())
        .await
        .unwrap_err();

    assert!(
        error
            .to_string()
            .contains("invalid provider integration_type from database row: 99"),
        "unexpected error: {error}"
    );
}

async fn sqlite_pool() -> SqlitePool {
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap()
}

fn owner_subject() -> AppProvidersSubject {
    AppProvidersSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    }
}

fn list_query() -> AppProvidersListQuery {
    AppProvidersListQuery {
        page_no: 1,
        page_size: 20,
        offset: 0,
        q: None,
    }
}

async fn create_provider_tables(pool: &SqlitePool) {
    for statement in [
        r#"
        CREATE TABLE ops_config_snapshot (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            source_table TEXT NOT NULL,
            status INTEGER NOT NULL,
            created_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_provider (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            provider_code TEXT NOT NULL,
            default_vendor_code TEXT,
            provider_type TEXT,
            auth_type INTEGER,
            display_name TEXT,
            description TEXT,
            base_url TEXT,
            status INTEGER NOT NULL,
            sort_order INTEGER,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE integration_proxy (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            endpoint TEXT,
            status INTEGER NOT NULL,
            health_status INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_channel (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            provider_id INTEGER,
            provider_code TEXT NOT NULL,
            channel_code TEXT,
            proxy_id INTEGER,
            base_url TEXT,
            status INTEGER NOT NULL,
            health_status INTEGER NOT NULL,
            priority INTEGER NOT NULL,
            weight INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_resource (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            resource_code TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            catalog_key TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )
        "#,
        r#"
        CREATE TABLE ai_channel_resource (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            status INTEGER NOT NULL,
            effective_from TEXT,
            effective_to TEXT,
            deleted_at TEXT
        )
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_providers(pool: &SqlitePool) {
    for integration_type in [2, 3] {
        seed_provider_with_type(pool, integration_type).await;
    }
}

async fn seed_provider_with_type(pool: &SqlitePool, integration_type: i64) {
    let (id, code, vendor, name, url, sort_order, provider_type) = if integration_type == 2 {
        (
            1,
            "azure_openai",
            "openai",
            "Azure OpenAI",
            "https://azure.example.test/openai",
            1,
            "cloud_platform",
        )
    } else {
        (
            2,
            "openrouter",
            "openai",
            "OpenRouter",
            "https://relay.example.test/openrouter",
            2,
            if integration_type == 3 {
                "relay_aggregator"
            } else {
                "unsupported"
            },
        )
    };

    sqlx::query(
        r#"
        INSERT INTO ai_provider (
            id, tenant_id, organization_id, provider_code, default_vendor_code, provider_type, auth_type,
            display_name, description, base_url, status, sort_order
        )
        VALUES (?, 100001, 0, ?, ?, ?, ?, ?, 'Provider integration', ?, 1, ?)
        "#,
    )
    .bind(id)
    .bind(code)
    .bind(vendor)
    .bind(provider_type)
    .bind(integration_type)
    .bind(name)
    .bind(url)
    .bind(sort_order)
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_channel (
            id, tenant_id, organization_id, provider_id, provider_code, channel_code,
            base_url, status, health_status, priority, weight
        )
        VALUES (?, 100001, 0, ?, ?, ?, ?, 1, 1, 10, 100)
        "#,
    )
    .bind(2000 + id)
    .bind(id)
    .bind(code)
    .bind(format!("chn-{id}"))
    .bind(url)
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_resource (
            id, tenant_id, organization_id, resource_code, resource_type, catalog_key, status
        )
        VALUES (?, 100001, 0, ?, 'model_api', 'openai/gpt-4o-mini', 1)
        "#,
    )
    .bind(3000 + id)
    .bind(format!("model.{code}.gpt-4o-mini"))
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource (
            id, tenant_id, organization_id, channel_id, resource_id, resource_code, grant_type, status
        )
        VALUES (?, 100001, 0, ?, ?, ?, 'allow', 1)
        "#,
    )
    .bind(4000 + id)
    .bind(2000 + id)
    .bind(3000 + id)
    .bind(format!("model.{code}.gpt-4o-mini"))
    .execute(pool)
    .await
    .unwrap();
}
