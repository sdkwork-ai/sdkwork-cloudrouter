use std::sync::Arc;

use sdkwork_clawrouter_router_service::application::ApiKeySecretCodec;
use sdkwork_clawrouter_router_service::infrastructure::crypto::RingAeadApiKeySecretCodec;
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminChannelStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminChannelCredentialInput, AdminChannelStore, AdminChannelSubject, CreateAdminChannelCommand,
    DeleteAdminChannelCommand, ListAdminChannelsQuery, UpdateAdminChannelCommand,
};
use sdkwork_clawrouter_router_service_test_support::schema_sqlite_pool;
use serde_json::Value;

#[tokio::test]
async fn sqlite_admin_channel_store_encrypts_channel_api_key_material() {
    let pool = schema_sqlite_pool().await;
    seed_channel_capability_prerequisites(&pool).await;
    let codec = Arc::new(RingAeadApiKeySecretCodec::new("test-pepper").unwrap());
    let store = SqliteAdminChannelStore::with_api_key_secret_codec(pool.clone(), codec.clone());

    let item = store
        .create_channel(CreateAdminChannelCommand {
            subject: AdminChannelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            channel_uuid: "channel-api-key-credential".to_owned(),
            audit_log_uuid: "audit-api-key-credential".to_owned(),
            config_snapshot_uuid: "snapshot-api-key-credential".to_owned(),
            name: "OpenAI primary".to_owned(),
            vendor: "OpenAI".to_owned(),
            provider_code: "openai".to_owned(),
            channel_type: "official".to_owned(),
            protocol: "OpenAI".to_owned(),
            access_type: "Standard API Key".to_owned(),
            credential_rotation: "weighted_round_robin".to_owned(),
            credentials: vec![AdminChannelCredentialInput {
                credential_uuid: "channel-credential-api-key-credential".to_owned(),
                name: "primary".to_owned(),
                base_url: "https://api.openai.com/v1".to_owned(),
                secret_ref: "secret://ai-channel-credentials/openai/testhash".to_owned(),
                secret_hash: "test-secret-hash".to_owned(),
                masked_label: "sk-l***cret".to_owned(),
                credential_material: Some("sk-live-provider-secret".to_owned()),
                priority: 10,
                weight: 100,
                status: "active".to_owned(),
            }],
            capabilities: vec!["llm".to_owned()],
            resource_codes: vec![
                "vendor.openai".to_owned(),
                "model.openai.gpt-4o-mini.chat".to_owned(),
            ],
            is_multimodal: false,
            timeout_ms: None,
            retry_policy_json: None,
            circuit_breaker_policy_json: None,
            expires_at: Some("2026-06-30T08:00:00Z".to_owned()),
            weight: 100,
            status: "active".to_owned(),
            request_id: "req-api-key-credential".to_owned(),
            requested_at: "2026-05-18 12:00:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!("weighted_round_robin", item.credential_rotation);
    assert_eq!(1, item.credentials.len());
    assert_eq!(
        "secret://ai-channel-credentials/openai/testhash",
        item.credentials[0].secret_ref
    );
    assert_eq!("2026-05-18 12:00:00", item.created_at);
    assert_eq!(Some("2026-06-30T08:00:00Z"), item.expires_at.as_deref());
    let channel_metadata_json: String =
        sqlx::query_scalar("SELECT CAST(metadata AS TEXT) FROM ai_channel WHERE id = ?")
            .bind(item.id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let channel_metadata: Value = serde_json::from_str(&channel_metadata_json).unwrap();
    assert_eq!(
        Some("2026-06-30T08:00:00Z"),
        channel_metadata.get("expiresAt").and_then(Value::as_str)
    );
    let auth_config_json: String = sqlx::query_scalar(
        "SELECT CAST(auth_config AS TEXT) FROM ai_channel_credential WHERE credential_ref = ?",
    )
    .bind("secret://ai-channel-credentials/openai/testhash")
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(!auth_config_json.contains("sk-live-provider-secret"));
    let auth_config: Value = serde_json::from_str(&auth_config_json).unwrap();
    assert_eq!(
        Some("channelCredentialInput"),
        auth_config.get("credentialSource").and_then(Value::as_str)
    );
    assert_eq!(
        Some("encrypted-channel-auth-config"),
        auth_config
            .get("secretMaterialStorage")
            .and_then(Value::as_str)
    );
    let ciphertext = auth_config
        .get("secretMaterialCiphertext")
        .and_then(Value::as_str)
        .expect("channel auth_config should contain encrypted key material");
    assert_ne!("sk-live-provider-secret", ciphertext);
    assert_eq!(
        "sk-live-provider-secret",
        codec.decode_secret(ciphertext).unwrap()
    );

    let listed = store
        .list_channels(ListAdminChannelsQuery {
            subject: AdminChannelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            page_no: 1,
            page_size: 100,
            offset: 0,
            q: None,
        })
        .await
        .unwrap();
    assert_eq!(
        Some("sk-live-provider-secret"),
        listed
            .items
            .first()
            .and_then(|item| item.credentials.first())
            .and_then(|credential| credential.api_key.as_deref())
    );
    assert_eq!(
        Some("2026-06-30T08:00:00Z"),
        listed
            .items
            .first()
            .and_then(|item| item.expires_at.as_deref())
    );
    assert_eq!(
        Some("official"),
        listed.items.first().map(|item| item.channel_type.as_str())
    );
    let channel_id: i64 = sqlx::query_scalar("SELECT id FROM ai_channel WHERE id = ?")
        .bind(item.id)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(channel_id, item.channel_id);
    assert_eq!(
        Some(channel_id),
        listed.items.first().map(|item| item.channel_id)
    );
    assert_eq!(
        vec![
            "vendor.openai".to_owned(),
            "model.openai.gpt-4o-mini.chat".to_owned(),
            "modality.llm".to_owned(),
        ],
        listed
            .items
            .first()
            .map(|item| item.resource_codes.clone())
            .unwrap_or_default()
    );
    let channel_type: String =
        sqlx::query_scalar(
            "SELECT c.channel_type FROM ai_channel c JOIN ai_channel_credential cc ON cc.channel_id = c.id WHERE cc.credential_ref = ?",
        )
            .bind("secret://ai-channel-credentials/openai/testhash")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("official", channel_type);
    let channel_resource_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM ai_channel_resource WHERE channel_id = ? AND status = 1 AND grant_type = 'allow' AND deleted_at IS NULL",
    )
    .bind(item.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(3, channel_resource_count);

    let (config_version, changed_object_type, changed_object_id): (i64, String, i64) =
        sqlx::query_as(
            r#"
            SELECT config_version, changed_object_type, changed_object_id
            FROM ai_config_version
            WHERE tenant_id = 100001
              AND organization_id = 0
              AND config_scope = 'routing'
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(1, config_version);
    assert_eq!("ai_channel", changed_object_type);
    assert_eq!(item.id, changed_object_id);

    let (event_version, event_status, event_action): (i64, String, String) = sqlx::query_as(
        r#"
        SELECT config_version, event_status, event_payload ->> 'action' AS event_action
        FROM ai_config_change_event
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND config_scope = 'routing'
          AND changed_object_type = 'ai_channel'
          AND changed_object_id = ?
        "#,
    )
    .bind(item.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, event_version);
    assert_eq!("pending", event_status);
    assert_eq!("create_channel", event_action);
}

#[tokio::test]
async fn sqlite_admin_channel_store_does_not_bind_models_to_accounts() {
    let pool = schema_sqlite_pool().await;
    seed_channel_capability_prerequisites(&pool).await;
    let codec = Arc::new(RingAeadApiKeySecretCodec::new("test-pepper").unwrap());
    let store = SqliteAdminChannelStore::with_api_key_secret_codec(pool.clone(), codec);
    let mut command = duplicate_secret_channel_command("no-account-models", "2026-05-18 12:02:30");
    command.resource_codes = vec!["model.openai.gpt-4o-mini.chat".to_owned()];

    let created = store.create_channel(command).await.unwrap();
    let channel_model_table_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'ai_channel_model'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, channel_model_table_count,
        "accounts must not be backed by ai_channel_model"
    );
    let listed = store
        .list_channels(ListAdminChannelsQuery {
            subject: AdminChannelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            page_no: 1,
            page_size: 100,
            offset: 0,
            q: None,
        })
        .await
        .unwrap();
    let listed_item = listed
        .items
        .iter()
        .find(|item| item.id == created.id)
        .expect("created account should be listed");
    let resource_codes = &listed_item.resource_codes;
    assert!(
        resource_codes.contains(&"model.openai.gpt-4o-mini.chat".to_owned()),
        "model access should be represented through ai_channel_resource"
    );
    assert!(
        resource_codes.contains(&"vendor.openai".to_owned()),
        "model resources should derive vendor scope for account routing"
    );
    assert!(
        resource_codes.contains(&"modality.llm".to_owned()),
        "model resources should derive modality scope for account routing"
    );
}

#[tokio::test]
async fn sqlite_admin_channel_store_prefers_resource_group_for_group_backed_resource_code() {
    let pool = schema_sqlite_pool().await;
    seed_channel_capability_prerequisites(&pool).await;
    seed_bundle_resource_group(&pool, "bundle.test.standard").await;
    let codec = Arc::new(RingAeadApiKeySecretCodec::new("test-pepper").unwrap());
    let store = SqliteAdminChannelStore::with_api_key_secret_codec(pool.clone(), codec);
    let mut command =
        duplicate_secret_channel_command("bundle-resource-group", "2026-05-18 12:02:00");
    command.resource_codes = vec!["bundle.test.standard".to_owned()];

    let created = store.create_channel(command).await.unwrap();

    let (resource_id, resource_code, resource_group_id, resource_group_code): (
        Option<i64>,
        Option<String>,
        Option<i64>,
        Option<String>,
    ) = sqlx::query_as(
        r#"
        SELECT resource_id, resource_code, resource_group_id, resource_group_code
        FROM ai_channel_resource
        WHERE channel_id = ?
          AND resource_group_code = 'bundle.test.standard'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .bind(created.id)
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(None, resource_id);
    assert_eq!(Some(String::new()), resource_code);
    assert_eq!(Some(990301), resource_group_id);
    assert_eq!(Some("bundle.test.standard".to_owned()), resource_group_code);
}

#[tokio::test]
async fn sqlite_admin_channel_store_updates_modality_resources_without_clearing_vendor_resources() {
    let pool = schema_sqlite_pool().await;
    seed_channel_capability_prerequisites(&pool).await;
    let codec = Arc::new(RingAeadApiKeySecretCodec::new("test-pepper").unwrap());
    let store = SqliteAdminChannelStore::with_api_key_secret_codec(pool.clone(), codec);

    let created = store
        .create_channel(CreateAdminChannelCommand {
            subject: AdminChannelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            channel_uuid: "channel-modality-resource-update".to_owned(),
            audit_log_uuid: "audit-modality-resource-update-create".to_owned(),
            config_snapshot_uuid: "snapshot-modality-resource-update-create".to_owned(),
            name: "OpenAI modality resource".to_owned(),
            vendor: "OpenAI".to_owned(),
            provider_code: "openai".to_owned(),
            channel_type: "official".to_owned(),
            protocol: "OpenAI".to_owned(),
            access_type: "Standard API Key".to_owned(),
            credential_rotation: "priority".to_owned(),
            credentials: vec![AdminChannelCredentialInput {
                credential_uuid: "channel-credential-modality-resource".to_owned(),
                name: "primary".to_owned(),
                base_url: "https://api.openai.com/v1".to_owned(),
                secret_ref: "secret://ai-channel-credentials/openai/modality-resource".to_owned(),
                secret_hash: "modality-resource-secret-hash".to_owned(),
                masked_label: "sk-m***ource".to_owned(),
                credential_material: Some("sk-live-modality-resource".to_owned()),
                priority: 10,
                weight: 100,
                status: "active".to_owned(),
            }],
            capabilities: vec!["llm".to_owned()],
            resource_codes: vec![
                "vendor.openai".to_owned(),
                "api.openai.chat_completions".to_owned(),
            ],
            is_multimodal: false,
            timeout_ms: None,
            retry_policy_json: None,
            circuit_breaker_policy_json: None,
            expires_at: None,
            weight: 100,
            status: "active".to_owned(),
            request_id: "req-modality-resource-update-create".to_owned(),
            requested_at: "2026-05-18 12:00:00".to_owned(),
        })
        .await
        .unwrap();

    let updated = store
        .update_channel(UpdateAdminChannelCommand {
            subject: AdminChannelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            channel_id: created.id,
            audit_log_uuid: "audit-modality-resource-update".to_owned(),
            config_snapshot_uuid: "snapshot-modality-resource-update".to_owned(),
            name: None,
            vendor: None,
            provider_code: None,
            channel_type: None,
            protocol: None,
            access_type: None,
            credential_rotation: None,
            credentials: None,
            capabilities: Some(vec!["llm".to_owned(), "image".to_owned()]),
            resource_codes: None,
            timeout_ms: None,
            retry_policy_json: None,
            circuit_breaker_policy_json: None,
            expires_at: None,
            weight: None,
            status: Some("disabled".to_owned()),
            request_id: "req-modality-resource-update".to_owned(),
            requested_at: "2026-05-18 12:05:00".to_owned(),
        })
        .await
        .unwrap()
        .expect("channel should update");

    assert_eq!(
        vec!["llm".to_owned(), "image".to_owned()],
        updated.capabilities
    );
    assert_eq!(
        vec![
            "vendor.openai".to_owned(),
            "api.openai.chat_completions".to_owned(),
            "modality.llm".to_owned(),
            "modality.image".to_owned(),
        ],
        updated.resource_codes
    );
}

#[tokio::test]
async fn sqlite_admin_channel_store_allows_duplicate_secret_hash_for_distinct_channels() {
    let pool = schema_sqlite_pool().await;
    seed_channel_capability_prerequisites(&pool).await;
    let codec = Arc::new(RingAeadApiKeySecretCodec::new("test-pepper").unwrap());
    let store = SqliteAdminChannelStore::with_api_key_secret_codec(pool.clone(), codec);

    let first = store
        .create_channel(duplicate_secret_channel_command(
            "primary",
            "2026-05-18 12:00:00",
        ))
        .await
        .unwrap();
    let second = store
        .create_channel(duplicate_secret_channel_command(
            "backup",
            "2026-05-18 12:01:00",
        ))
        .await
        .unwrap();

    assert_ne!(first.id, second.id);
    assert_eq!("OpenAI primary", first.name);
    assert_eq!("OpenAI backup", second.name);

    let channel_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel_credential
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND credential_hash = 'duplicate-secret-hash'
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        2, channel_count,
        "duplicate credentials must be allowed for distinct AI channels"
    );
}

#[tokio::test]
async fn sqlite_admin_channel_store_soft_delete_cascades_channel_relationships() {
    let pool = schema_sqlite_pool().await;
    seed_channel_capability_prerequisites(&pool).await;
    let codec = Arc::new(RingAeadApiKeySecretCodec::new("test-pepper").unwrap());
    let store = SqliteAdminChannelStore::with_api_key_secret_codec(pool.clone(), codec);

    let created = store
        .create_channel(duplicate_secret_channel_command(
            "delete-cascade",
            "2026-05-18 12:10:00",
        ))
        .await
        .unwrap();
    let deleted = store
        .delete_channel(DeleteAdminChannelCommand {
            subject: AdminChannelSubject {
                tenant_id: 100001,
                organization_id: 0,
                operator_id: 30,
                operator_type: 1,
            },
            channel_id: created.id,
            audit_log_uuid: "audit-delete-channel-cascade".to_owned(),
            config_snapshot_uuid: "snapshot-delete-channel-cascade".to_owned(),
            request_id: "req-delete-channel-cascade".to_owned(),
            requested_at: "2026-05-18 12:11:00".to_owned(),
        })
        .await
        .unwrap();
    assert!(deleted);

    let active_relation_count: i64 = sqlx::query_scalar(
        r#"
        SELECT (
            SELECT COUNT(1)
            FROM ai_channel_credential
            WHERE tenant_id = 100001
              AND organization_id = 0
              AND channel_id = ?
              AND deleted_at IS NULL
        ) + (
            SELECT COUNT(1)
            FROM ai_channel_resource
            WHERE tenant_id = 100001
              AND organization_id = 0
              AND channel_id = ?
              AND deleted_at IS NULL
        )
        "#,
    )
    .bind(created.id)
    .bind(created.id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, active_relation_count,
        "soft-deleting a channel must soft-delete every channel-owned relationship row"
    );
}

fn duplicate_secret_channel_command(suffix: &str, requested_at: &str) -> CreateAdminChannelCommand {
    CreateAdminChannelCommand {
        subject: AdminChannelSubject {
            tenant_id: 100001,
            organization_id: 0,
            operator_id: 30,
            operator_type: 1,
        },
        channel_uuid: format!("{suffix}-channel-duplicate-secret"),
        audit_log_uuid: format!("audit-duplicate-secret-{suffix}"),
        config_snapshot_uuid: format!("snapshot-duplicate-secret-{suffix}"),
        name: format!("OpenAI {suffix}"),
        vendor: "OpenAI".to_owned(),
        provider_code: "openai".to_owned(),
        channel_type: "official".to_owned(),
        protocol: "OpenAI".to_owned(),
        access_type: "Standard API Key".to_owned(),
        credential_rotation: "default".to_owned(),
        credentials: vec![AdminChannelCredentialInput {
            credential_uuid: format!("channel-credential-duplicate-secret-{suffix}"),
            name: "primary".to_owned(),
            base_url: "https://api.openai.com/v1".to_owned(),
            secret_ref: format!("secret://ai-channel-credentials/openai/duplicate/{suffix}"),
            secret_hash: "duplicate-secret-hash".to_owned(),
            masked_label: "sk-l***same".to_owned(),
            credential_material: Some("sk-live-duplicate-provider-secret".to_owned()),
            priority: 100,
            weight: 100,
            status: "active".to_owned(),
        }],
        capabilities: vec!["llm".to_owned()],
        resource_codes: Vec::new(),
        is_multimodal: false,
        timeout_ms: None,
        retry_policy_json: None,
        circuit_breaker_policy_json: None,
        expires_at: None,
        weight: 100,
        status: "active".to_owned(),
        request_id: format!("req-duplicate-secret-{suffix}"),
        requested_at: requested_at.to_owned(),
    }
}

async fn seed_channel_capability_prerequisites(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        INSERT INTO ai_model_vendor
            (id, uuid, tenant_id, organization_id, vendor_code, display_name, status)
        VALUES
            (990200, 'vendor-openai-channel-test', 100001, 0, 'openai', 'OpenAI', 1)
        ON CONFLICT(tenant_id, organization_id, vendor_code) DO UPDATE SET
            display_name = excluded.display_name,
            status = excluded.status,
            deleted_at = NULL
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, vendor_code)
        VALUES
            (990201, 'resource-vendor-openai-channel-test', 100001, 0, 1, 'vendor.openai', 'vendor', 'OpenAI', 'openai')
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            resource_type = excluded.resource_type,
            display_name = excluded.display_name,
            vendor_code = excluded.vendor_code,
            status = excluded.status,
            deleted_at = NULL
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, modality_code)
        VALUES
            (990202, 'resource-modality-llm-channel-test', 100001, 0, 1, 'modality.llm', 'modality', 'LLM', 'llm')
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            resource_type = excluded.resource_type,
            display_name = excluded.display_name,
            modality_code = excluded.modality_code,
            status = excluded.status,
            deleted_at = NULL
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model)
        VALUES
            (990203, 'resource-model-openai-gpt-4o-mini-channel-test', 100001, 0, 1, 'model.openai.gpt-4o-mini.chat', 'model_api', 'GPT-4o mini Chat', 'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini')
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            resource_type = excluded.resource_type,
            display_name = excluded.display_name,
            vendor_code = excluded.vendor_code,
            modality_code = excluded.modality_code,
            api_code = excluded.api_code,
            catalog_key = excluded.catalog_key,
            model = excluded.model,
            provider_native_model = excluded.provider_native_model,
            status = excluded.status,
            deleted_at = NULL
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, api_code)
        VALUES
            (990204, 'resource-api-openai-chat-channel-test', 100001, 0, 1, 'api.openai.chat_completions', 'api_endpoint', 'OpenAI Chat Completions', 'openai.chat_completions')
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            resource_type = excluded.resource_type,
            display_name = excluded.display_name,
            api_code = excluded.api_code,
            status = excluded.status,
            deleted_at = NULL
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, modality_code)
        VALUES
            (990205, 'resource-modality-image-channel-test', 100001, 0, 1, 'modality.image', 'modality', 'Image', 'image')
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            resource_type = excluded.resource_type,
            display_name = excluded.display_name,
            modality_code = excluded.modality_code,
            status = excluded.status,
            deleted_at = NULL
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}

async fn seed_bundle_resource_group(pool: &sqlx::SqlitePool, resource_code: &str) {
    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name)
        VALUES
            (990300, 'resource-bundle-test-standard', 100001, 0, 1, ?, 'bundle', 'Test Bundle')
        "#,
    )
    .bind(resource_code)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_resource_group
            (id, uuid, tenant_id, organization_id, status, group_code, group_name, group_type)
        VALUES
            (990301, 'resource-group-bundle-test-standard', 100001, 0, 1, ?, 'Test Bundle', 'bundle')
        "#,
    )
    .bind(resource_code)
    .execute(pool)
    .await
    .unwrap();
}
