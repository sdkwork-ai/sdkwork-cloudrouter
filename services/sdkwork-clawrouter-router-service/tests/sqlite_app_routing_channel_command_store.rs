use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAppRoutingChannelCommandStore;
use sdkwork_clawrouter_router_service::ports::{
    AppRoutingChannelCommandStore, AppRoutingSubject, CreateAppRoutingChannelCommand,
    DeleteAppRoutingChannelCommand, UpdateAppRoutingChannelCommand,
};
use sdkwork_clawrouter_router_service_test_support::schema_sqlite_pool;

#[tokio::test]
async fn sqlite_app_routing_channel_command_store_create_binds_vendor_and_resources_not_models() {
    let pool = schema_sqlite_pool().await;
    seed_app_routing_resource_catalog(&pool).await;
    let store = SqliteAppRoutingChannelCommandStore::new(pool.clone());

    let outcome = store
        .create_channel(CreateAppRoutingChannelCommand {
            subject: AppRoutingSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            channel_uuid: "app-routing-channel-resource-create".to_owned(),
            account_uuid: "app-routing-account-resource-create".to_owned(),
            provider_uuid: "app-routing-provider-resource-create".to_owned(),
            audit_log_uuid: "audit-app-routing-resource-create".to_owned(),
            config_snapshot_uuid: "snapshot-app-routing-resource-create".to_owned(),
            name: "OpenAI Resource Account".to_owned(),
            vendor: "OpenAI".to_owned(),
            provider_code: "openai".to_owned(),
            protocol: "OpenAI".to_owned(),
            access_type: "Standard API Key".to_owned(),
            base_url: Some("https://api.openai.com/v1".to_owned()),
            secret_ref: "secret://app-routing/openai-resource-create".to_owned(),
            capabilities: vec!["llm".to_owned()],
            is_multimodal: false,
            timeout_ms: Some(30_000),
            retry_policy_json: None,
            circuit_breaker_policy_json: None,
            weight: 100,
            status: "active".to_owned(),
            request_id: "req-app-routing-resource-create".to_owned(),
            requested_at: "2026-05-29 09:00:00".to_owned(),
        })
        .await
        .unwrap();

    let channel_id = outcome.item.id.parse::<i64>().unwrap();
    assert!(
        outcome.item.models.is_empty(),
        "app routing accounts must not expose model allowlists"
    );

    let channel_model_table_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'ai_channel_model'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, channel_model_table_count,
        "app routing accounts must not be backed by ai_channel_model"
    );

    let active_resource_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel_resource
        WHERE channel_id = ?
          AND COALESCE(NULLIF(resource_code, ''), resource_group_code) IN (
              'vendor.openai',
              'modality.llm'
          )
          AND deleted_at IS NULL
        "#,
    )
    .bind(channel_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2, active_resource_count);
}

async fn seed_app_routing_resource_catalog(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        INSERT INTO ai_model_vendor
            (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order)
        VALUES
            (42001, 'app-routing-vendor-openai', 100001, 0, 'openai', 'OpenAI', 1, 1)
        ON CONFLICT(tenant_id, organization_id, vendor_code) DO UPDATE SET
            status = 1,
            deleted_at = NULL,
            display_name = excluded.display_name
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, status, sort_order)
        VALUES
            (42011, 'app-routing-resource-vendor-openai', 0, 0, 'vendor.openai', 'vendor', 'OpenAI', 'openai', 1, 1)
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            status = 1,
            deleted_at = NULL,
            display_name = excluded.display_name
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_code, modality_code, catalog_key, model, provider_native_model, status, sort_order)
        VALUES
            (42012, 'app-routing-resource-openai-gpt-4o-mini-chat', 0, 0, 'model.openai.gpt-4o-mini.chat', 'model_api', 'GPT-4o mini Chat', 'openai', 'chat', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 2)
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            status = 1,
            deleted_at = NULL,
            display_name = excluded.display_name
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, modality_code, status, sort_order)
        VALUES
            (42013, 'app-routing-resource-modality-llm', 0, 0, 'modality.llm', 'modality', 'LLM', 'llm', 1, 3)
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            status = 1,
            deleted_at = NULL,
            display_name = excluded.display_name
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

#[tokio::test]
async fn sqlite_app_routing_channel_command_store_update_keeps_primary_credential_current() {
    let pool = schema_sqlite_pool().await;
    seed_app_routing_resource_catalog(&pool).await;
    let store = SqliteAppRoutingChannelCommandStore::new(pool.clone());

    let created = store
        .create_channel(CreateAppRoutingChannelCommand {
            subject: AppRoutingSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            channel_uuid: "app-routing-channel-credential-update".to_owned(),
            account_uuid: "app-routing-account-credential-update".to_owned(),
            provider_uuid: "app-routing-provider-credential-update".to_owned(),
            audit_log_uuid: "audit-app-routing-credential-update-create".to_owned(),
            config_snapshot_uuid: "snapshot-app-routing-credential-update-create".to_owned(),
            name: "OpenAI Credential Update Account".to_owned(),
            vendor: "OpenAI".to_owned(),
            provider_code: "openai".to_owned(),
            protocol: "OpenAI".to_owned(),
            access_type: "Standard API Key".to_owned(),
            base_url: Some("https://api.openai.com/v1".to_owned()),
            secret_ref: "secret://app-routing/openai-credential-update-v1".to_owned(),
            capabilities: vec!["llm".to_owned()],
            is_multimodal: false,
            timeout_ms: Some(30_000),
            retry_policy_json: None,
            circuit_breaker_policy_json: None,
            weight: 100,
            status: "active".to_owned(),
            request_id: "req-app-routing-credential-update-create".to_owned(),
            requested_at: "2026-05-29 09:10:00".to_owned(),
        })
        .await
        .unwrap();
    let channel_id = created.item.id.parse::<i64>().unwrap();

    store
        .update_channel(UpdateAppRoutingChannelCommand {
            subject: AppRoutingSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            channel_id,
            provider_uuid: "app-routing-provider-credential-update-v2".to_owned(),
            audit_log_uuid: "audit-app-routing-credential-update-update".to_owned(),
            config_snapshot_uuid: "snapshot-app-routing-credential-update-update".to_owned(),
            name: None,
            vendor: None,
            provider_code: None,
            protocol: None,
            access_type: None,
            base_url: Some(Some("https://proxy.openai.local/v1".to_owned())),
            secret_ref: Some("secret://app-routing/openai-credential-update-v2".to_owned()),
            capabilities: None,
            timeout_ms: None,
            retry_policy_json: None,
            circuit_breaker_policy_json: None,
            weight: None,
            status: None,
            request_id: "req-app-routing-credential-update-update".to_owned(),
            requested_at: "2026-05-29 09:15:00".to_owned(),
        })
        .await
        .unwrap()
        .expect("routing channel should be updated");

    let (base_url, credential_ref): (String, String) = sqlx::query_as(
        r#"
        SELECT base_url, credential_ref
        FROM ai_channel_credential
        WHERE channel_id = ?
          AND tenant_id = 100001
          AND organization_id = 0
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY priority ASC, id ASC
        LIMIT 1
        "#,
    )
    .bind(channel_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!("https://proxy.openai.local/v1", base_url);
    assert_eq!(
        "secret://app-routing/openai-credential-update-v2",
        credential_ref
    );
}

#[tokio::test]
async fn sqlite_app_routing_channel_command_store_delete_cascades_channel_relationships() {
    let pool = schema_sqlite_pool().await;
    seed_app_routing_channel_with_relationships(&pool).await;
    let store = SqliteAppRoutingChannelCommandStore::new(pool.clone());

    let outcome = store
        .delete_channel(DeleteAppRoutingChannelCommand {
            subject: AppRoutingSubject {
                tenant_id: 100001,
                organization_id: 0,
                user_id: 30,
            },
            channel_id: 41001,
            audit_log_uuid: "audit-app-routing-delete-channel".to_owned(),
            config_snapshot_uuid: "snapshot-app-routing-delete-channel".to_owned(),
            request_id: "req-app-routing-delete-channel".to_owned(),
            requested_at: "2026-05-29 10:00:00".to_owned(),
        })
        .await
        .unwrap();

    assert!(outcome.deleted);

    let active_relation_count: i64 = sqlx::query_scalar(
        r#"
        SELECT (
            SELECT COUNT(1)
            FROM ai_channel_resource
            WHERE tenant_id = 100001
              AND organization_id = 0
              AND channel_id = 41001
              AND deleted_at IS NULL
        )
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, active_relation_count,
        "deleting a routing channel must soft-delete every channel-owned relationship row"
    );
}

async fn seed_app_routing_channel_with_relationships(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        INSERT INTO ai_channel
            (id, uuid, tenant_id, organization_id, status, provider_code, channel_code, channel_name, channel_type, base_url, credential_ref, masked_label)
        VALUES
            (41001, 'app-routing-channel-delete-cascade', 100001, 0, 1, 'openai', 'app-routing-openai', 'App Routing OpenAI', 'official', 'https://api.openai.com/v1', 'secret://app-routing/openai', 'sk-***openai')
        "#,
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, status, channel_id, provider_code, channel_code, resource_code, grant_type)
        VALUES
            (41021, 'app-routing-channel-resource-delete-cascade', 100001, 0, 1, 41001, 'openai', 'app-routing-openai', 'model.openai.gpt-4o-mini.chat', 'allow')
        "#,
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, status, channel_id, provider_code, channel_code, resource_code, grant_type)
        VALUES
            (41031, 'app-routing-channel-vendor-delete-cascade', 100001, 0, 1, 41001, 'openai', 'app-routing-openai', 'vendor.openai', 'allow')
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
