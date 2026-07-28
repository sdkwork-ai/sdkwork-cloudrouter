use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminProviderSecretStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminProviderSecretStore, AdminProviderSecretSubject, CreateAdminProviderSecretCommand,
    DeleteAdminProviderSecretCommand, UpdateAdminProviderSecretCommand,
};
use sdkwork_clawrouter_router_service_test_support::schema_sqlite_pool;

#[tokio::test]
async fn sqlite_admin_provider_secret_store_records_routing_config_version_for_secret_changes() {
    let pool = schema_sqlite_pool().await;
    let store = SqliteAdminProviderSecretStore::new(pool.clone());

    let created = store
        .create_provider_secret(CreateAdminProviderSecretCommand {
            subject: subject(),
            account_uuid: "provider-secret-openai-main".to_owned(),
            account_code: "openai-main".to_owned(),
            audit_log_uuid: "audit-provider-secret-create".to_owned(),
            config_snapshot_uuid: "snapshot-provider-secret-create".to_owned(),
            supplier_code: "openai".to_owned(),
            name: "OpenAI main".to_owned(),
            auth_type: "api-key".to_owned(),
            secret_ref: "vault://providers/openai/main".to_owned(),
            masked_label: "sk-***main".to_owned(),
            status: "active".to_owned(),
            request_id: "req-provider-secret-create".to_owned(),
            requested_at: "2026-05-28 10:00:00".to_owned(),
        })
        .await
        .unwrap();

    store
        .update_provider_secret(UpdateAdminProviderSecretCommand {
            subject: subject(),
            secret_id: created.id,
            audit_log_uuid: "audit-provider-secret-update".to_owned(),
            config_snapshot_uuid: "snapshot-provider-secret-update".to_owned(),
            supplier_code: None,
            name: Some("OpenAI rotated".to_owned()),
            auth_type: None,
            secret_ref: Some("vault://providers/openai/rotated".to_owned()),
            masked_label: Some("sk-***rotated".to_owned()),
            status: Some("disabled".to_owned()),
            request_id: "req-provider-secret-update".to_owned(),
            requested_at: "2026-05-28 10:01:00".to_owned(),
        })
        .await
        .unwrap()
        .expect("provider secret should update");

    let deleted = store
        .delete_provider_secret(DeleteAdminProviderSecretCommand {
            subject: subject(),
            secret_id: created.id,
            audit_log_uuid: "audit-provider-secret-delete".to_owned(),
            config_snapshot_uuid: "snapshot-provider-secret-delete".to_owned(),
            request_id: "req-provider-secret-delete".to_owned(),
            requested_at: "2026-05-28 10:02:00".to_owned(),
        })
        .await
        .unwrap();
    assert!(deleted);

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
    assert_eq!(3, config_version);
    assert_eq!("integration_provider_account", changed_object_type);
    assert_eq!(created.id, changed_object_id);

    let global_config_version: i64 = sqlx::query_scalar(
        r#"
        SELECT config_version
        FROM ai_config_version
        WHERE tenant_id = 0
          AND organization_id = 0
          AND config_scope = 'routing'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        3, global_config_version,
        "runtime cache refresh must have a single global routing version row for fast distributed polling"
    );

    let event_actions: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT event_payload ->> 'action' AS event_action
        FROM ai_config_change_event
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND config_scope = 'routing'
          AND changed_object_type = 'integration_provider_account'
          AND changed_object_id = ?
        ORDER BY config_version ASC
        "#,
    )
    .bind(created.id)
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(
        vec![
            "create_provider_secret".to_owned(),
            "update_provider_secret".to_owned(),
            "delete_provider_secret".to_owned()
        ],
        event_actions
    );
}

fn subject() -> AdminProviderSecretSubject {
    AdminProviderSecretSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    }
}
