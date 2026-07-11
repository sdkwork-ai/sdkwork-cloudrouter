use sdkwork_claw_test_support::DialectTestContext;
use sdkwork_clawrouter_app_providers_repository_sqlx::{
    AppProvidersListQuery, AppProvidersReadStore, AppProvidersSubject,
    PostgresAppProvidersReadStore, SqliteAppProvidersReadStore,
};

#[tokio::test]
async fn postgres_and_sqlite_return_the_same_scoped_provider_page() -> anyhow::Result<()> {
    let databases = DialectTestContext::require("app_providers").await?;
    for statement in [
        r#"
        CREATE TABLE ops_config_snapshot (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            source_table TEXT NOT NULL,
            status BIGINT NOT NULL,
            created_at TIMESTAMPTZ
        )
        "#,
        r#"
        CREATE TABLE ai_provider (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT,
            organization_id BIGINT,
            provider_code TEXT NOT NULL,
            default_vendor_code TEXT,
            provider_type TEXT,
            auth_type BIGINT,
            display_name TEXT,
            description TEXT,
            base_url TEXT,
            status BIGINT NOT NULL,
            sort_order BIGINT,
            deleted_at TIMESTAMPTZ
        )
        "#,
        r#"
        CREATE TABLE integration_proxy (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            endpoint TEXT,
            status BIGINT NOT NULL,
            health_status BIGINT NOT NULL,
            deleted_at TIMESTAMPTZ
        )
        "#,
        r#"
        CREATE TABLE ai_channel (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            provider_id BIGINT,
            provider_code TEXT NOT NULL,
            channel_code TEXT,
            proxy_id BIGINT,
            base_url TEXT,
            status BIGINT NOT NULL,
            health_status BIGINT NOT NULL,
            priority BIGINT NOT NULL,
            weight BIGINT NOT NULL,
            deleted_at TIMESTAMPTZ
        )
        "#,
        r#"
        CREATE TABLE ai_resource (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_code TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            catalog_key TEXT,
            status BIGINT NOT NULL,
            deleted_at TIMESTAMPTZ
        )
        "#,
        r#"
        CREATE TABLE ai_channel_resource (
            id BIGINT NOT NULL PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            channel_id BIGINT NOT NULL,
            resource_id BIGINT,
            resource_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            status BIGINT NOT NULL,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        )
        "#,
        r#"
        INSERT INTO ai_provider (
            id, tenant_id, organization_id, provider_code, default_vendor_code,
            provider_type, auth_type, display_name, description, base_url, status, sort_order
        ) VALUES
            (1, 100001, 0, 'azure_openai', 'openai', 'cloud_platform', 2,
             'Azure OpenAI', 'Provider integration', 'https://azure.example.test/openai', 1, 1),
            (2, 100002, 0, 'other_provider', 'openai', 'cloud_platform', 2,
             'Other Tenant', 'Hidden provider', 'https://other.example.test', 1, 1)
        "#,
        r#"
        INSERT INTO ai_channel (
            id, tenant_id, organization_id, provider_id, provider_code, channel_code,
            base_url, status, health_status, priority, weight
        ) VALUES
            (2001, 100001, 0, 1, 'azure_openai', 'chn-1',
             'https://azure.example.test/openai', 1, 1, 10, 100)
        "#,
        r#"
        INSERT INTO ai_resource (
            id, tenant_id, organization_id, resource_code, resource_type, catalog_key, status
        ) VALUES
            (3001, 100001, 0, 'model.azure.gpt-4o-mini', 'model_api',
             'openai/gpt-4o-mini', 1)
        "#,
        r#"
        INSERT INTO ai_channel_resource (
            id, tenant_id, organization_id, channel_id, resource_id, resource_code,
            grant_type, status
        ) VALUES
            (4001, 100001, 0, 2001, 3001, 'model.azure.gpt-4o-mini', 'allow', 1)
        "#,
    ] {
        databases.execute_both(statement).await?;
    }

    let subject = AppProvidersSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    };
    let query = AppProvidersListQuery {
        page_no: 1,
        page_size: 20,
        offset: 0,
        q: Some("Azure".to_owned()),
    };
    let sqlite_page = SqliteAppProvidersReadStore::new(databases.sqlite_pool())
        .load_providers(Some(subject), query.clone())
        .await?;
    let postgres_page = PostgresAppProvidersReadStore::new(databases.postgres_pool())
        .load_providers(Some(subject), query)
        .await?;

    assert_eq!(sqlite_page, postgres_page);
    assert_eq!(1, sqlite_page.total);
    assert_eq!("Azure OpenAI", sqlite_page.items[0].name);
    assert_eq!("active", sqlite_page.items[0].status);

    databases.cleanup().await
}
