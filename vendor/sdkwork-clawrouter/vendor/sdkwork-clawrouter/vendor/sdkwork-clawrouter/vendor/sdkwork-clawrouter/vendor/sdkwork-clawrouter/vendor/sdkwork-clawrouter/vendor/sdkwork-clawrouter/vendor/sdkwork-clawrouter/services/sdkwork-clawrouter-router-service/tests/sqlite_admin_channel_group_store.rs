use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqliteAdminChannelGroupStore;
use sdkwork_clawrouter_router_service::ports::{
    AdminChannelGroupChannelBindingInput, AdminChannelGroupStore, AdminChannelGroupSubject,
    CreateAdminChannelGroupCommand, ListAdminChannelGroupChannelBindingsQuery,
    ReplaceAdminChannelGroupChannelBindingsCommand, UpdateAdminChannelGroupCommand,
};
use sdkwork_clawrouter_router_service_test_support::schema_sqlite_pool;

#[tokio::test]
async fn sqlite_admin_channel_group_store_allows_one_channel_in_multiple_groups() {
    let pool = schema_sqlite_pool().await;
    seed_channel_group_channel_fixture(&pool).await;
    let store = SqliteAdminChannelGroupStore::new(pool.clone());
    let subject = AdminChannelGroupSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    let group_10_bindings = store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            10,
            vec![
                binding_input(3001, 10, 80, "active"),
                binding_input(3003, 20, 30, "active"),
            ],
            "2026-05-25 10:00:00",
        ))
        .await
        .unwrap();
    assert_eq!(2, group_10_bindings.len());
    assert_eq!(3001, group_10_bindings[0].channel_id);
    assert_eq!("OpenAI primary", group_10_bindings[0].channel_name);

    let group_11_bindings = store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            11,
            vec![binding_input(3001, 5, 50, "active")],
            "2026-05-25 10:01:00",
        ))
        .await
        .unwrap();
    assert_eq!(1, group_11_bindings.len());
    assert_eq!(3001, group_11_bindings[0].channel_id);

    let shared_channel_active_group_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel_group_member
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_id = 3001
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        2, shared_channel_active_group_count,
        "one channel account must be reusable by multiple groups"
    );

    let replaced_group_10_bindings = store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            10,
            vec![binding_input(3001, 1, 100, "active")],
            "2026-05-25 10:02:00",
        ))
        .await
        .unwrap();
    assert_eq!(1, replaced_group_10_bindings.len());
    assert_eq!(1, replaced_group_10_bindings[0].priority);
    assert_eq!(100, replaced_group_10_bindings[0].weight);

    let group_11_after_replace = store
        .list_channel_bindings(ListAdminChannelGroupChannelBindingsQuery {
            subject,
            group_id: 11,
        })
        .await
        .unwrap();
    assert_eq!(1, group_11_after_replace.len());
    assert_eq!(
        3001, group_11_after_replace[0].channel_id,
        "replacing one group must not remove another group's channel usage"
    );
}

#[tokio::test]
async fn sqlite_admin_channel_group_store_prefers_resource_group_for_group_backed_resource_code() {
    let pool = schema_sqlite_pool().await;
    seed_channel_group_channel_fixture(&pool).await;
    let store = SqliteAdminChannelGroupStore::new(pool.clone());
    let subject = AdminChannelGroupSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            10,
            vec![binding_input(3001, 1, 100, "active")],
            "2026-05-25 10:03:00",
        ))
        .await
        .unwrap();

    let (resource_id, resource_code, resource_group_id, resource_group_code): (
        Option<i64>,
        Option<String>,
        Option<i64>,
        Option<String>,
    ) = sqlx::query_as(
        r#"
        SELECT resource_id, resource_code, resource_group_id, resource_group_code
        FROM ai_channel_group_resource
        WHERE channel_group_id = 10
          AND resource_group_code = 'bundle.openrouter.openai.standard'
          AND status = 1
          AND deleted_at IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(None, resource_id);
    assert_eq!(Some(String::new()), resource_code);
    assert_eq!(Some(990401), resource_group_id);
    assert_eq!(
        Some("bundle.openrouter.openai.standard".to_owned()),
        resource_group_code
    );
}

#[tokio::test]
async fn sqlite_admin_channel_group_store_keeps_resource_authorization_normalized_and_cascades_group_delete(
) {
    let pool = schema_sqlite_pool().await;
    seed_channel_group_channel_fixture(&pool).await;
    let store = SqliteAdminChannelGroupStore::new(pool.clone());
    let subject = AdminChannelGroupSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            10,
            vec![binding_input(3001, 1, 100, "active")],
            "2026-05-25 10:04:00",
        ))
        .await
        .unwrap();

    let resource_codes: Vec<Option<String>> = sqlx::query_scalar(
        r#"
        SELECT NULLIF(resource_code, '')
        FROM ai_channel_group_resource
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_group_id = 10
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY priority ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(3, resource_codes.len());
    assert!(resource_codes.contains(&Some("api.openai.chat_completions".to_owned())));
    assert!(resource_codes.contains(&Some("model.openai.gpt-4o-mini.chat".to_owned())));
    assert!(
        resource_codes.contains(&None),
        "resource-group-backed authorization rows store the code in resource_group_code"
    );

    let dangling_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel_group_resource gr
        LEFT JOIN ai_resource r
          ON r.id = gr.resource_id
         AND r.tenant_id = gr.tenant_id
         AND r.organization_id = gr.organization_id
         AND r.deleted_at IS NULL
        LEFT JOIN ai_resource_group rg
          ON rg.id = gr.resource_group_id
         AND rg.tenant_id = gr.tenant_id
         AND rg.organization_id = gr.organization_id
         AND rg.deleted_at IS NULL
        WHERE gr.tenant_id = 100001
          AND gr.organization_id = 0
          AND gr.channel_group_id = 10
          AND gr.status = 1
          AND gr.deleted_at IS NULL
          AND r.id IS NULL
          AND rg.id IS NULL
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, dangling_count);

    let deleted = store
        .delete_channel_group(
            sdkwork_clawrouter_router_service::ports::DeleteAdminChannelGroupCommand {
                subject,
                group_id: 10,
                audit_log_uuid: "audit-delete-group-10".to_owned(),
                config_snapshot_uuid: "snapshot-delete-group-10".to_owned(),
                request_id: "req-delete-group-10".to_owned(),
                requested_at: "2026-05-25 10:05:00".to_owned(),
            },
        )
        .await
        .unwrap();
    assert!(deleted);

    let active_relation_count: i64 = sqlx::query_scalar(
        r#"
        SELECT (
            SELECT COUNT(1)
            FROM ai_channel_group_member
            WHERE tenant_id = 100001
              AND organization_id = 0
              AND channel_group_id = 10
              AND deleted_at IS NULL
        ) + (
            SELECT COUNT(1)
            FROM ai_channel_group_resource
            WHERE tenant_id = 100001
              AND organization_id = 0
              AND channel_group_id = 10
              AND deleted_at IS NULL
        )
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        0, active_relation_count,
        "soft-deleting a group must also soft-delete member and resource relationship rows"
    );
}

#[tokio::test]
async fn sqlite_admin_channel_group_store_creates_and_updates_direct_resource_access() {
    let pool = schema_sqlite_pool().await;
    seed_system_resource_access_fixture(&pool).await;
    let store = SqliteAdminChannelGroupStore::new(pool.clone());
    let subject = AdminChannelGroupSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    let created = store
        .create_channel_group(CreateAdminChannelGroupCommand {
            subject,
            group_uuid: "resource-access-group".to_owned(),
            audit_log_uuid: "audit-resource-access-create".to_owned(),
            config_snapshot_uuid: "snapshot-resource-access-create".to_owned(),
            binding_uuid: "pricing-binding-resource-access-create".to_owned(),
            group_code: "resource-access-group".to_owned(),
            group_name: "Resource Access Group".to_owned(),
            provider_code: "openai".to_owned(),
            price_reference_mode: "multiplier".to_owned(),
            rate_multiplier: 1.0,
            official_price_multiplier: 1.0,
            group_type: "public".to_owned(),
            resource_group_codes: vec!["api.openai.chat".to_owned()],
            resource_codes: vec!["api.openai.chat_completions".to_owned()],
            capacity_total: 100.0,
            status: "active".to_owned(),
            request_id: "req-resource-access-create".to_owned(),
            requested_at: "2026-06-02 10:00:00".to_owned(),
        })
        .await
        .unwrap();

    assert_eq!(vec!["api.openai.chat"], created.resource_group_codes);
    assert_eq!(vec!["api.openai.chat_completions"], created.resource_codes);

    let rows: Vec<(Option<i64>, Option<String>, Option<i64>, Option<String>)> = sqlx::query_as(
        r#"
        SELECT resource_group_id, NULLIF(resource_group_code, ''), resource_id, NULLIF(resource_code, '')
        FROM ai_channel_group_resource
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND channel_group_id = ?
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY priority ASC
        "#,
    )
    .bind(created.id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(
        vec![
            (Some(995001), Some("api.openai.chat".to_owned()), None, None),
            (
                None,
                None,
                Some(995101),
                Some("api.openai.chat_completions".to_owned())
            )
        ],
        rows
    );

    let updated = store
        .update_channel_group(UpdateAdminChannelGroupCommand {
            subject,
            group_id: created.id,
            audit_log_uuid: "audit-resource-access-update".to_owned(),
            config_snapshot_uuid: "snapshot-resource-access-update".to_owned(),
            binding_uuid: "pricing-binding-resource-access-update".to_owned(),
            group_code: None,
            group_name: Some("Resource Access Group Updated".to_owned()),
            provider_code: None,
            price_reference_mode: None,
            rate_multiplier: None,
            official_price_multiplier: None,
            group_type: None,
            resource_group_codes: Some(vec!["api.openai.codex".to_owned()]),
            resource_codes: Some(vec![
                "api.openai.responses".to_owned(),
                "api.openai.containers".to_owned(),
            ]),
            capacity_total: None,
            status: None,
            request_id: "req-resource-access-update".to_owned(),
            requested_at: "2026-06-02 10:01:00".to_owned(),
        })
        .await
        .unwrap()
        .unwrap();

    assert_eq!(vec!["api.openai.codex"], updated.resource_group_codes);
    assert_eq!(
        vec!["api.openai.responses", "api.openai.containers"],
        updated.resource_codes
    );

    let listed = store
        .list_channel_groups(
            sdkwork_clawrouter_router_service::ports::ListAdminChannelGroupsQuery { subject },
        )
        .await
        .unwrap();
    let listed_group = listed
        .iter()
        .find(|item| item.id == created.id)
        .expect("updated resource access group should be listed");
    assert_eq!(vec!["api.openai.codex"], listed_group.resource_group_codes);
    assert_eq!(
        vec!["api.openai.responses", "api.openai.containers"],
        listed_group.resource_codes
    );
}

#[tokio::test]
async fn sqlite_admin_channel_group_store_syncs_relationship_status_when_group_status_changes() {
    let pool = schema_sqlite_pool().await;
    seed_channel_group_channel_fixture(&pool).await;
    let store = SqliteAdminChannelGroupStore::new(pool.clone());
    let subject = AdminChannelGroupSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            10,
            vec![
                binding_input(3001, 1, 100, "active"),
                binding_input(3003, 2, 50, "disabled"),
            ],
            "2026-05-25 10:06:00",
        ))
        .await
        .unwrap();

    let disabled = store
        .update_channel_group(update_channel_group_status_command(
            subject,
            "disabled",
            "2026-05-25 10:07:00",
        ))
        .await
        .unwrap()
        .expect("channel group should update");
    assert_eq!("disabled", disabled.status);

    let (active_member_count, active_resource_count): (i64, i64) = sqlx::query_as(
        r#"
        SELECT
            (
                SELECT COUNT(1)
                FROM ai_channel_group_member
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_member_count,
            (
                SELECT COUNT(1)
                FROM ai_channel_group_resource
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_resource_count
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, active_member_count);
    assert_eq!(0, active_resource_count);

    let enabled = store
        .update_channel_group(update_channel_group_status_command(
            subject,
            "active",
            "2026-05-25 10:08:00",
        ))
        .await
        .unwrap()
        .expect("channel group should update");
    assert_eq!("active", enabled.status);

    let (active_member_count, active_resource_count): (i64, i64) = sqlx::query_as(
        r#"
        SELECT
            (
                SELECT COUNT(1)
                FROM ai_channel_group_member
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_member_count,
            (
                SELECT COUNT(1)
                FROM ai_channel_group_resource
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_resource_count
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        1, active_member_count,
        "re-enabling the group must not reactivate bindings that were individually disabled"
    );
    assert_eq!(3, active_resource_count);
}

#[tokio::test]
async fn sqlite_admin_channel_group_store_keeps_replaced_relationships_disabled_when_group_is_disabled(
) {
    let pool = schema_sqlite_pool().await;
    seed_channel_group_channel_fixture(&pool).await;
    let store = SqliteAdminChannelGroupStore::new(pool.clone());
    let subject = AdminChannelGroupSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    store
        .update_channel_group(update_channel_group_status_command(
            subject,
            "disabled",
            "2026-05-25 10:09:00",
        ))
        .await
        .unwrap()
        .expect("channel group should update");

    store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            10,
            vec![binding_input(3001, 1, 100, "active")],
            "2026-05-25 10:10:00",
        ))
        .await
        .unwrap();

    let (active_member_count, active_resource_count): (i64, i64) = sqlx::query_as(
        r#"
        SELECT
            (
                SELECT COUNT(1)
                FROM ai_channel_group_member
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_member_count,
            (
                SELECT COUNT(1)
                FROM ai_channel_group_resource
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_resource_count
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, active_member_count);
    assert_eq!(0, active_resource_count);

    store
        .update_channel_group(update_channel_group_status_command(
            subject,
            "active",
            "2026-05-25 10:11:00",
        ))
        .await
        .unwrap()
        .expect("channel group should update");

    let (active_member_count, active_resource_count): (i64, i64) = sqlx::query_as(
        r#"
        SELECT
            (
                SELECT COUNT(1)
                FROM ai_channel_group_member
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_member_count,
            (
                SELECT COUNT(1)
                FROM ai_channel_group_resource
                WHERE tenant_id = 100001
                  AND organization_id = 0
                  AND channel_group_id = 10
                  AND status = 1
                  AND deleted_at IS NULL
            ) AS active_resource_count
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(1, active_member_count);
    assert_eq!(3, active_resource_count);
}

#[tokio::test]
async fn sqlite_admin_channel_group_store_records_routing_config_version_for_group_and_binding_changes(
) {
    let pool = schema_sqlite_pool().await;
    seed_channel_group_channel_fixture(&pool).await;
    let store = SqliteAdminChannelGroupStore::new(pool.clone());
    let subject = AdminChannelGroupSubject {
        tenant_id: 100001,
        organization_id: 0,
        operator_id: 30,
        operator_type: 1,
    };

    store
        .replace_channel_bindings(replace_bindings_command(
            subject,
            10,
            vec![binding_input(3001, 1, 100, "active")],
            "2026-05-25 10:12:00",
        ))
        .await
        .unwrap();
    store
        .update_channel_group(update_channel_group_status_command(
            subject,
            "disabled",
            "2026-05-25 10:13:00",
        ))
        .await
        .unwrap()
        .expect("channel group should update");

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
    assert_eq!(2, config_version);
    assert_eq!("ai_channel_group", changed_object_type);
    assert_eq!(10, changed_object_id);

    let event_actions: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT event_payload ->> 'action' AS event_action
        FROM ai_config_change_event
        WHERE tenant_id = 100001
          AND organization_id = 0
          AND config_scope = 'routing'
          AND changed_object_type = 'ai_channel_group'
          AND changed_object_id = 10
        ORDER BY config_version ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(
        vec![
            "replace_channel_group_channel_bindings".to_owned(),
            "update_channel_group".to_owned()
        ],
        event_actions
    );
}

fn replace_bindings_command(
    subject: AdminChannelGroupSubject,
    group_id: i64,
    items: Vec<AdminChannelGroupChannelBindingInput>,
    requested_at: &str,
) -> ReplaceAdminChannelGroupChannelBindingsCommand {
    let suffix = requested_at
        .chars()
        .filter(|value| value.is_ascii_alphanumeric())
        .collect::<String>();
    ReplaceAdminChannelGroupChannelBindingsCommand {
        subject,
        group_id,
        binding_uuids: items
            .iter()
            .enumerate()
            .map(|(index, item)| format!("binding-{group_id}-{}-{index}", item.channel_id))
            .collect(),
        audit_log_uuid: format!("audit-group-channel-{group_id}-{suffix}"),
        config_snapshot_uuid: format!("snapshot-group-channel-{group_id}-{suffix}"),
        items,
        request_id: format!("req-group-channel-{group_id}-{suffix}"),
        requested_at: requested_at.to_owned(),
    }
}

fn update_channel_group_status_command(
    subject: AdminChannelGroupSubject,
    status: &str,
    requested_at: &str,
) -> UpdateAdminChannelGroupCommand {
    let suffix = requested_at
        .chars()
        .filter(|value| value.is_ascii_alphanumeric())
        .collect::<String>();
    UpdateAdminChannelGroupCommand {
        subject,
        group_id: 10,
        audit_log_uuid: format!("audit-update-group-status-{suffix}"),
        config_snapshot_uuid: format!("snapshot-update-group-status-{suffix}"),
        binding_uuid: format!("pricing-binding-update-group-status-{suffix}"),
        group_code: None,
        group_name: None,
        provider_code: None,
        price_reference_mode: None,
        rate_multiplier: None,
        official_price_multiplier: None,
        group_type: None,
        resource_group_codes: None,
        resource_codes: None,
        capacity_total: None,
        status: Some(status.to_owned()),
        request_id: format!("req-update-group-status-{suffix}"),
        requested_at: requested_at.to_owned(),
    }
}

fn binding_input(
    channel_id: i64,
    priority: i64,
    weight: i64,
    status: &str,
) -> AdminChannelGroupChannelBindingInput {
    AdminChannelGroupChannelBindingInput {
        channel_id,
        priority,
        weight,
        status: status.to_owned(),
        resource_codes: vec![
            "model.openai.gpt-4o-mini.chat".to_owned(),
            "api.openai.chat_completions".to_owned(),
            "bundle.openrouter.openai.standard".to_owned(),
        ],
        api_scope: vec!["openai.chat_completions".to_owned()],
        capabilities: vec!["llm".to_owned()],
    }
}

async fn seed_channel_group_channel_fixture(pool: &sqlx::SqlitePool) {
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group
            (id, uuid, tenant_id, organization_id, status, group_name, group_code, provider_code, billing_type, group_type, capacity_limit, rate_multiplier)
        VALUES
            (10, 'group-standard', 100001, 0, 1, 'Standard group', 'standard-group', 'openai', 1, 1, 100000, '1.000000'),
            (11, 'group-premium', 100001, 0, 1, 'Premium group', 'premium-group', 'openai', 1, 1, 100000, '1.000000')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_provider
            (id, uuid, tenant_id, organization_id, status, provider_code, display_name, base_url)
        VALUES
            (1001, 'provider-openai', 100001, 0, 1, 'openai', 'OpenAI', 'https://api.openai.com/v1'),
            (1003, 'provider-google', 100001, 0, 1, 'google', 'Google', 'https://generativelanguage.googleapis.com/v1')
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, uuid, tenant_id, organization_id, status, provider_id, provider_code, channel_code, channel_name, channel_type, base_url, credential_ref, masked_label, priority, weight, health_status)
        VALUES
            (3001, 'channel-openai-primary', 100001, 0, 1, 1001, 'openai', 'openai-primary', 'OpenAI primary', 'official', 'https://api.openai.com/v1', 'secret://ai-channels/openai/main', 'sk-***main', 10, 80, 1),
            (3003, 'channel-google-fallback', 100001, 0, 1, 1003, 'google', 'google-fallback', 'Google fallback', 'official', 'https://generativelanguage.googleapis.com/v1', 'secret://ai-channels/google/main', 'sk-***main', 20, 30, 1)
        "#,
    )
    .execute(pool)
    .await
    .unwrap();

    for statement in [
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, api_code)
        VALUES
            (990410, 'resource-api-openai-chat-access-group-test', 100001, 0, 1, 'api.openai.chat_completions', 'api_endpoint', 'OpenAI Chat Completions', 'openai.chat_completions')
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            resource_type = excluded.resource_type,
            display_name = excluded.display_name,
            api_code = excluded.api_code,
            status = excluded.status,
            deleted_at = NULL
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, vendor_code, modality_code, api_code, catalog_key, model, provider_native_model)
        VALUES
            (990411, 'resource-model-openai-gpt-4o-mini-access-group-test', 100001, 0, 1, 'model.openai.gpt-4o-mini.chat', 'model_api', 'GPT-4o mini Chat', 'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini')
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
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }

    seed_bundle_resource_group(pool, "bundle.openrouter.openai.standard").await;
}

async fn seed_bundle_resource_group(pool: &sqlx::SqlitePool, resource_code: &str) {
    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name)
        VALUES
            (990400, 'resource-bundle-openrouter-openai-standard', 100001, 0, 1, ?, 'bundle', 'OpenRouter OpenAI Standard')
        ON CONFLICT(tenant_id, organization_id, resource_code) DO UPDATE SET
            resource_type = excluded.resource_type,
            display_name = excluded.display_name,
            status = excluded.status,
            deleted_at = NULL
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
            (990401, 'resource-group-openrouter-openai-standard', 100001, 0, 1, ?, 'OpenRouter OpenAI Standard', 'bundle')
        ON CONFLICT(tenant_id, organization_id, group_code) DO UPDATE SET
            group_name = excluded.group_name,
            group_type = excluded.group_type,
            status = excluded.status,
            deleted_at = NULL
        "#,
    )
    .bind(resource_code)
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_system_resource_access_fixture(pool: &sqlx::SqlitePool) {
    for statement in [
        r#"
        INSERT INTO ai_resource_group
            (id, uuid, tenant_id, organization_id, status, group_code, group_name, group_type, selection_mode, sort_order)
        VALUES
            (995001, 'system-resource-group-openai-chat', 0, 0, 1, 'api.openai.chat', 'OpenAI Chat API', 'api_group', 'manual', 1),
            (995002, 'system-resource-group-openai-codex', 0, 0, 1, 'api.openai.codex', 'OpenAI Codex API', 'api_group', 'manual', 2)
        "#,
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, status, resource_code, resource_type, display_name, api_code)
        VALUES
            (995101, 'system-resource-openai-chat-completions', 0, 0, 1, 'api.openai.chat_completions', 'api_endpoint', 'OpenAI Chat Completions', 'openai.chat_completions'),
            (995102, 'system-resource-openai-responses', 0, 0, 1, 'api.openai.responses', 'api_endpoint', 'OpenAI Responses', 'openai.responses'),
            (995103, 'system-resource-openai-containers', 0, 0, 1, 'api.openai.containers', 'api_endpoint', 'OpenAI Containers', 'openai.containers')
        "#,
    ] {
        sqlx::query(statement).execute(pool).await.unwrap();
    }
}
