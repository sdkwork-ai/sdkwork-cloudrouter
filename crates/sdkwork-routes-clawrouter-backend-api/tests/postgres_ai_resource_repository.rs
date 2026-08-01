use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_models_catalog_repository_sqlx::PostgresAdminAiResourceStore;
use sdkwork_models_contract_service::{
    AdminAiResourceStore, AdminAiResourceSubject, ListAdminAiResourceGroupResourcesQuery,
    ListAdminAiResourceGroupsQuery, ListAdminAiResourcesQuery,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

#[tokio::test]
async fn postgres_admin_ai_resource_read_models_decode_int4_status_columns() {
    let Some(context) = PostgresTestContext::new("admin_ai_resource_status").await else {
        return;
    };
    create_admin_ai_resource_tables(&context.pool).await;
    seed_admin_ai_resource_group(&context.pool).await;

    let store = PostgresAdminAiResourceStore::new(context.pool.clone());
    let subject = AdminAiResourceSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    let resources = store
        .list_ai_resources(ListAdminAiResourcesQuery {
            subject,
            q: None,
            resource_type: None,
            limit: None,
            offset: None,
        })
        .await
        .unwrap();
    assert_eq!(1, resources.items.len());
    assert_eq!(1, resources.total_count);
    assert_eq!("active", resources.items[0].status);
    assert_eq!(Some(4), resources.items[0].sort_order);

    let groups = store
        .list_ai_resource_groups(ListAdminAiResourceGroupsQuery {
            subject,
            q: None,
            limit: None,
            offset: None,
        })
        .await
        .unwrap();
    assert_eq!(1, groups.items.len());
    assert_eq!(1, groups.total_count);
    assert_eq!("active", groups.items[0].status);
    assert_eq!(Some(1), groups.items[0].sort_order);

    let group_resources = store
        .list_ai_resource_group_resources(ListAdminAiResourceGroupResourcesQuery {
            subject,
            group_id_or_code: "bundle.openrouter.openai.standard".to_owned(),
            q: None,
            limit: None,
            offset: None,
        })
        .await
        .unwrap();
    assert_eq!(1, group_resources.items.len());
    assert_eq!(1, group_resources.total_count);
    assert_eq!("active", group_resources.items[0].status);
    assert_eq!(Some(1), group_resources.items[0].sort_order);

    context.cleanup().await;
}

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping PostgreSQL AI resource integration test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = unique_schema_name(label);
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(&format!("DROP SCHEMA IF EXISTS {quoted_schema} CASCADE"))
            .execute(&admin_pool)
            .await
            .unwrap();
        sqlx::query(&format!("CREATE SCHEMA {quoted_schema}"))
            .execute(&admin_pool)
            .await
            .unwrap();
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(&format!("SET search_path TO {}", quote_identifier(&schema)))
                        .execute(&mut *connection)
                        .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .unwrap();

        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        let Self {
            pool,
            database_url,
            schema,
        } = self;
        pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(&format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
        ))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;
    }
}

async fn create_admin_ai_resource_tables(pool: &PgPool) {
    for statement in [
        r#"CREATE TABLE ai_resource (
            id BIGINT PRIMARY KEY,
            uuid VARCHAR(128) NOT NULL,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_code VARCHAR(128) NOT NULL,
            resource_type VARCHAR(64) NOT NULL,
            display_name VARCHAR(256) NOT NULL,
            vendor_code VARCHAR(64),
            modality_code VARCHAR(64),
            api_code VARCHAR(128),
            catalog_key VARCHAR(256),
            model VARCHAR(256),
            provider_native_model VARCHAR(256),
            resource_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
            status INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_resource_group (
            id BIGINT PRIMARY KEY,
            uuid VARCHAR(128) NOT NULL,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            group_code VARCHAR(128) NOT NULL,
            group_name VARCHAR(256) NOT NULL,
            group_type VARCHAR(64) NOT NULL,
            selection_mode VARCHAR(64) NOT NULL,
            description TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_resource_group_item (
            id BIGINT PRIMARY KEY,
            uuid VARCHAR(128) NOT NULL,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_group_id BIGINT NOT NULL,
            resource_group_code VARCHAR(128) NOT NULL,
            item_type VARCHAR(64) NOT NULL,
            resource_id BIGINT,
            resource_code VARCHAR(128),
            child_resource_group_id BIGINT,
            child_resource_group_code VARCHAR(128),
            item_role VARCHAR(64),
            metadata JSONB,
            status INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER,
            deleted_at TIMESTAMPTZ
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_admin_ai_resource_group(pool: &PgPool) {
    for statement in [
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, resource_schema, status, sort_order)
        VALUES
            (9104, 'resource-model-openai-gpt-4o-mini-admin-ai-resource-status', 100001, 0, 'model.openai.gpt-4o-mini.chat', 'model_api', 'GPT-4o mini Chat', 'openai', 'chat', 'openai.chat_completions', '{"capability":"chat"}'::jsonb, 1, 4)
        "#,
        r#"
        INSERT INTO ai_resource_group
            (id, uuid, tenant_id, organization_id, group_code, group_name, group_type, selection_mode, status, sort_order)
        VALUES
            (9201, 'resource-group-openrouter-openai-admin-ai-resource-status', 100001, 0, 'bundle.openrouter.openai.standard', 'OpenRouter OpenAI Standard', 'api_group', 'manual', 1, 1)
        "#,
        r#"
        INSERT INTO ai_resource_group_item
            (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order)
        VALUES
            (9202, 'resource-group-item-openrouter-gpt-4o-mini-admin-ai-resource-status', 100001, 0, 9201, 'bundle.openrouter.openai.standard', 'resource', 9104, 'model.openai.gpt-4o-mini.chat', 'included', 1, 1)
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

fn unique_schema_name(label: &str) -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("sdkwork_claw_it_{label}_{millis}")
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
