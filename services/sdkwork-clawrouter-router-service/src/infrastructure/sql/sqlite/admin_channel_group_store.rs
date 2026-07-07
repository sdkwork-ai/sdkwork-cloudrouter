use std::collections::BTreeSet;

use sha2::{Digest, Sha256};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_sqlite_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminChannelGroupChannelBindingItem, AdminChannelGroupCommandFuture, AdminChannelGroupItem,
    AdminChannelGroupListPage, AdminChannelGroupStore, AdminChannelGroupSubject,
    CreateAdminChannelGroupCommand, DeleteAdminChannelGroupCommand,
    ListAdminChannelGroupChannelBindingsQuery, ListAdminChannelGroupsQuery,
    ReplaceAdminChannelGroupChannelBindingsCommand, UpdateAdminChannelGroupCommand,
};

const ACCESS_GROUP_TARGET_TYPE: i32 = 41;
const CHANNEL_GROUP_SUBJECT_TYPE: i32 = 3;
const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_ACCESS_GROUP: i32 = ACCESS_GROUP_TARGET_TYPE;
const RESOURCE_ACCESS_SOURCE_GROUP_FORM: &str = "group_form";
const RESOURCE_ACCESS_SOURCE_CHANNEL_BINDING: &str = "channel_binding";

#[derive(Debug, Clone)]
pub struct SqliteAdminChannelGroupStore {
    pool: SqlitePool,
}

impl SqliteAdminChannelGroupStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

impl AdminChannelGroupStore for SqliteAdminChannelGroupStore {
    fn list_channel_groups<'a>(
        &'a self,
        query: ListAdminChannelGroupsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, AdminChannelGroupListPage> {
        Box::pin(async move { list_channel_groups(&self.pool, query).await })
    }

    fn create_channel_group<'a>(
        &'a self,
        command: CreateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, AdminChannelGroupItem> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin channel group transaction", error)
                })?;
            let pricing_plan = find_default_pricing_plan(
                &mut tx,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?;
            let id = insert_channel_group(&mut tx, &command, pricing_plan.as_ref()).await?;
            if let Some((pricing_plan_id, pricing_plan_code)) = pricing_plan {
                upsert_pricing_plan_binding(
                    &mut tx,
                    &command.binding_uuid,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    id,
                    &command.group_code,
                    pricing_plan_id,
                    &pricing_plan_code,
                    command.rate_multiplier,
                    &command.requested_at,
                )
                .await?;
            }
            replace_group_resource_access(
                &mut tx,
                command.subject,
                id,
                &command.resource_group_codes,
                &command.resource_codes,
                status_code(&command.status),
                &command.requested_at,
                RESOURCE_ACCESS_SOURCE_GROUP_FORM,
                false,
            )
            .await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "create_channel_group",
                id,
                serde_json::json!({
                    "action": "create_channel_group",
                    "accessGroupId": id,
                    "groupName": &command.group_name,
                    "groupCode": &command.group_code,
                    "providerCode": &command.provider_code,
                    "priceReferenceMode": &command.price_reference_mode,
                    "rateMultiplier": command.rate_multiplier,
                    "officialPriceMultiplier": command.official_price_multiplier,
                    "groupType": &command.group_type,
                    "capacityTotal": command.capacity_total,
                    "resourceGroupCodes": &command.resource_group_codes,
                    "resourceCodes": &command.resource_codes,
                    "status": &command.status
                }),
                &command.requested_at,
            )
            .await?;
            insert_audit_log(
                &mut tx,
                &command.audit_log_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                command.subject.operator_type,
                "create_channel_group",
                id,
                serde_json::json!({
                    "action": "create_channel_group",
                    "accessGroupId": id,
                    "groupName": &command.group_name,
                    "groupCode": &command.group_code,
                    "providerCode": &command.provider_code,
                    "priceReferenceMode": &command.price_reference_mode,
                    "rateMultiplier": command.rate_multiplier,
                    "officialPriceMultiplier": command.official_price_multiplier,
                    "resourceGroupCodes": &command.resource_group_codes,
                    "resourceCodes": &command.resource_codes,
                    "status": &command.status
                }),
            )
            .await?;
            record_sqlite_ai_routing_config_change(
                &mut tx,
                channel_group_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "create_channel_group",
                    id,
                    serde_json::json!({
                        "accessGroupId": id,
                        "groupCode": &command.group_code,
                        "groupType": &command.group_type,
                        "resourceGroupCodes": &command.resource_group_codes,
                        "resourceCodes": &command.resource_codes,
                        "status": &command.status
                    }),
                ),
            )
            .await?;
            let item = load_channel_group_by_id(
                &mut tx,
                id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created channel group could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit channel group transaction", error)
            })?;
            Ok(item)
        })
    }

    fn update_channel_group<'a>(
        &'a self,
        command: UpdateAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Option<AdminChannelGroupItem>> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin channel group transaction", error)
                })?;
            let updated = update_channel_group(&mut tx, &command).await?;
            if !updated {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit channel group transaction", error)
                })?;
                return Ok(None);
            }
            if let Some(status) = command.status.as_deref() {
                sync_channel_group_relationship_status(
                    &mut tx,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.group_id,
                    status_code(status),
                    &command.requested_at,
                )
                .await?;
            }
            if command.resource_group_codes.is_some() || command.resource_codes.is_some() {
                let group_status = load_group_status(
                    &mut tx,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.group_id,
                )
                .await?;
                replace_group_resource_access(
                    &mut tx,
                    command.subject,
                    command.group_id,
                    command.resource_group_codes.as_deref().unwrap_or(&[]),
                    command.resource_codes.as_deref().unwrap_or(&[]),
                    group_status,
                    &command.requested_at,
                    RESOURCE_ACCESS_SOURCE_GROUP_FORM,
                    false,
                )
                .await?;
            }
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "update_channel_group",
                command.group_id,
                serde_json::json!({
                    "action": "update_channel_group",
                    "accessGroupId": command.group_id,
                    "groupCodeChanged": command.group_code.is_some(),
                    "groupNameChanged": command.group_name.is_some(),
                    "providerCodeChanged": command.provider_code.is_some(),
                    "priceReferenceModeChanged": command.price_reference_mode.is_some(),
                    "rateMultiplier": command.rate_multiplier,
                    "officialPriceMultiplier": command.official_price_multiplier,
                    "groupType": &command.group_type,
                    "capacityTotal": command.capacity_total,
                    "resourceGroupCodes": &command.resource_group_codes,
                    "resourceCodes": &command.resource_codes,
                    "status": &command.status
                }),
                &command.requested_at,
            )
            .await?;
            insert_audit_log(
                &mut tx,
                &command.audit_log_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                command.subject.operator_type,
                "update_channel_group",
                command.group_id,
                serde_json::json!({
                    "action": "update_channel_group",
                    "accessGroupId": command.group_id,
                    "groupCodeChanged": command.group_code.is_some(),
                    "groupNameChanged": command.group_name.is_some(),
                    "providerCodeChanged": command.provider_code.is_some(),
                    "priceReferenceModeChanged": command.price_reference_mode.is_some(),
                    "rateMultiplier": command.rate_multiplier,
                    "officialPriceMultiplier": command.official_price_multiplier,
                    "resourceGroupCodes": &command.resource_group_codes,
                    "resourceCodes": &command.resource_codes,
                    "status": command.status
                }),
            )
            .await?;
            record_sqlite_ai_routing_config_change(
                &mut tx,
                channel_group_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "update_channel_group",
                    command.group_id,
                    serde_json::json!({
                        "accessGroupId": command.group_id,
                        "groupCodeChanged": command.group_code.is_some(),
                        "priceReferenceModeChanged": command.price_reference_mode.is_some(),
                        "groupTypeChanged": command.group_type.is_some(),
                        "capacityChanged": command.capacity_total.is_some(),
                        "resourceAccessChanged": command.resource_group_codes.is_some() || command.resource_codes.is_some(),
                        "rateMultiplierChanged": command.rate_multiplier.is_some(),
                        "statusChanged": command.status.is_some()
                    }),
                ),
            )
            .await?;
            let item = load_channel_group_by_id(
                &mut tx,
                command.group_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?;
            if (command.rate_multiplier.is_some() || command.group_code.is_some()) && item.is_some()
            {
                if let Some((pricing_plan_id, pricing_plan_code)) = find_group_pricing_plan(
                    &mut tx,
                    command.group_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                )
                .await?
                {
                    let item_ref = item.as_ref().expect("checked is_some");
                    let subject_code = if item_ref.group_code.is_empty() {
                        format!("group-{}", command.group_id)
                    } else {
                        item_ref.group_code.clone()
                    };
                    upsert_pricing_plan_binding(
                        &mut tx,
                        &command.binding_uuid,
                        command.subject.tenant_id,
                        command.subject.organization_id,
                        command.group_id,
                        &subject_code,
                        pricing_plan_id,
                        &pricing_plan_code,
                        item_ref.rate_multiplier,
                        &command.requested_at,
                    )
                    .await?;
                }
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit channel group transaction", error)
            })?;
            Ok(item)
        })
    }

    fn delete_channel_group<'a>(
        &'a self,
        command: DeleteAdminChannelGroupCommand,
    ) -> AdminChannelGroupCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin channel group transaction", error)
                })?;
            let deleted = soft_delete_channel_group(&mut tx, &command).await?;
            if deleted {
                soft_delete_group_bindings(&mut tx, &command).await?;
                insert_config_snapshot(
                    &mut tx,
                    &command.config_snapshot_uuid,
                    &command.request_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    "delete_channel_group",
                    command.group_id,
                    serde_json::json!({
                        "action": "delete_channel_group",
                        "accessGroupId": command.group_id,
                        "deleted": true
                    }),
                    &command.requested_at,
                )
                .await?;
                insert_audit_log(
                    &mut tx,
                    &command.audit_log_uuid,
                    &command.request_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    command.subject.operator_type,
                    "delete_channel_group",
                    command.group_id,
                    serde_json::json!({
                        "action": "delete_channel_group",
                        "accessGroupId": command.group_id
                    }),
                )
                .await?;
                record_sqlite_ai_routing_config_change(
                    &mut tx,
                    channel_group_routing_config_change(
                        command.subject.tenant_id,
                        command.subject.organization_id,
                        command.subject.operator_id,
                        &command.request_id,
                        &command.requested_at,
                        "delete_channel_group",
                        command.group_id,
                        serde_json::json!({
                            "accessGroupId": command.group_id,
                            "deleted": true
                        }),
                    ),
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit channel group transaction", error)
            })?;
            Ok(deleted)
        })
    }

    fn list_channel_bindings<'a>(
        &'a self,
        query: ListAdminChannelGroupChannelBindingsQuery,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>> {
        Box::pin(async move { list_channel_bindings(&self.pool, query).await })
    }

    fn replace_channel_bindings<'a>(
        &'a self,
        command: ReplaceAdminChannelGroupChannelBindingsCommand,
    ) -> AdminChannelGroupCommandFuture<'a, Vec<AdminChannelGroupChannelBindingItem>> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error(
                    "failed to begin channel group channel binding transaction",
                    error,
                )
            })?;
            let items = replace_channel_bindings(&mut tx, &command).await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "replace_channel_group_channel_bindings",
                command.group_id,
                serde_json::json!({
                    "action": "replace_channel_group_channel_bindings",
                    "accessGroupId": command.group_id,
                    "channelIds": items.iter().map(|item| item.channel_id).collect::<Vec<_>>()
                }),
                &command.requested_at,
            )
            .await?;
            insert_audit_log(
                &mut tx,
                &command.audit_log_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                command.subject.operator_type,
                "replace_channel_group_channel_bindings",
                command.group_id,
                serde_json::json!({
                    "action": "replace_channel_group_channel_bindings",
                    "accessGroupId": command.group_id,
                    "channelIds": items.iter().map(|item| item.channel_id).collect::<Vec<_>>()
                }),
            )
            .await?;
            record_sqlite_ai_routing_config_change(
                &mut tx,
                channel_group_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "replace_channel_group_channel_bindings",
                    command.group_id,
                    serde_json::json!({
                        "accessGroupId": command.group_id,
                        "channelIds": items.iter().map(|item| item.channel_id).collect::<Vec<_>>(),
                        "resourceBindingsChanged": true
                    }),
                ),
            )
            .await?;
            tx.commit().await.map_err(|error| {
                store_error(
                    "failed to commit channel group channel binding transaction",
                    error,
                )
            })?;
            Ok(items)
        })
    }
}

async fn list_channel_bindings(
    pool: &SqlitePool,
    query: ListAdminChannelGroupChannelBindingsQuery,
) -> DomainResult<Vec<AdminChannelGroupChannelBindingItem>> {
    let rows = sqlx::query(channel_binding_select_sql(
        r#"
        WHERE b.tenant_id = ?
          AND b.organization_id = ?
          AND b.channel_group_id = ?
          AND b.deleted_at IS NULL
        ORDER BY b.priority ASC, b.weight DESC, b.id ASC
        "#,
    ))
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.group_id)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list channel group channel bindings", error))?;
    rows.into_iter()
        .map(channel_binding_item_from_row)
        .collect()
}

async fn replace_channel_bindings(
    tx: &mut Transaction<'_, Sqlite>,
    command: &ReplaceAdminChannelGroupChannelBindingsCommand,
) -> DomainResult<Vec<AdminChannelGroupChannelBindingItem>> {
    ensure_group_exists(
        tx,
        command.subject.tenant_id,
        command.subject.organization_id,
        command.group_id,
    )
    .await?;
    let group_status = load_group_status(
        tx,
        command.subject.tenant_id,
        command.subject.organization_id,
        command.group_id,
    )
    .await?;

    let channel_ids = command
        .items
        .iter()
        .map(|item| item.channel_id)
        .collect::<Vec<_>>();
    for channel_id in &channel_ids {
        ensure_channel_exists(
            tx,
            command.subject.tenant_id,
            command.subject.organization_id,
            *channel_id,
        )
        .await?;
    }

    if channel_ids.is_empty() {
        sqlx::query(
            r#"
            UPDATE ai_channel_group_member
            SET status = 0,
                deleted_at = ?,
                deleted_by = ?,
                updated_at = ?,
                version = COALESCE(version, 0) + 1
            WHERE tenant_id = ?
              AND organization_id = ?
              AND channel_group_id = ?
              AND deleted_at IS NULL
            "#,
        )
        .bind(&command.requested_at)
        .bind(command.subject.operator_id)
        .bind(&command.requested_at)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(command.group_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to clear channel group channel bindings", error))?;
    } else {
        let placeholders = std::iter::repeat("?")
            .take(channel_ids.len())
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            r#"
            UPDATE ai_channel_group_member
            SET status = 0,
                deleted_at = ?,
                deleted_by = ?,
                updated_at = ?,
                version = COALESCE(version, 0) + 1
            WHERE tenant_id = ?
              AND organization_id = ?
              AND channel_group_id = ?
              AND deleted_at IS NULL
              AND channel_id NOT IN ({placeholders})
            "#,
        );
        let mut query = sqlx::query(&sql)
            .bind(&command.requested_at)
            .bind(command.subject.operator_id)
            .bind(&command.requested_at)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .bind(command.group_id);
        for channel_id in &channel_ids {
            query = query.bind(*channel_id);
        }
        query.execute(&mut **tx).await.map_err(|error| {
            store_error(
                "failed to remove stale channel group channel bindings",
                error,
            )
        })?;
    }

    for (index, item) in command.items.iter().enumerate() {
        let binding_uuid = command
            .binding_uuids
            .get(index)
            .cloned()
            .unwrap_or_else(|| format!("group-channel-{}-{}", command.group_id, item.channel_id));
        let requested_status = status_code(&item.status);
        let persisted_status = relationship_status_for_group(group_status, requested_status);
        let metadata = relationship_metadata_for_group(
            group_status,
            requested_status,
            RESOURCE_ACCESS_SOURCE_CHANNEL_BINDING,
        );
        let binding_id = next_claw_runtime_id("ai_channel_group_member")?;
        sqlx::query(
            r#"
            INSERT INTO ai_channel_group_member
                (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, channel_group_id, channel_id, priority, weight, metadata, id)
            VALUES
                (?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tenant_id, organization_id, channel_group_id, channel_id)
            DO UPDATE SET
                status = excluded.status,
                updated_at = excluded.updated_at,
                deleted_at = NULL,
                deleted_by = NULL,
                version = COALESCE(ai_channel_group_member.version, 0) + 1,
                priority = excluded.priority,
                weight = excluded.weight,
                metadata = excluded.metadata
            "#,
        )
        .bind(binding_uuid)
        .bind(command.subject.tenant_id)
        .bind(command.subject.organization_id)
        .bind(persisted_status)
        .bind(&command.requested_at)
        .bind(&command.requested_at)
        .bind(command.group_id)
        .bind(item.channel_id)
        .bind(item.priority)
        .bind(item.weight)
        .bind(metadata)
        .bind(binding_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| {
            store_error("failed to upsert channel group channel binding", error)
        })?;
    }

    replace_group_resources_from_channel_bindings(tx, command, group_status).await?;

    list_channel_bindings_for_tx(tx, command).await
}

async fn list_channel_bindings_for_tx(
    tx: &mut Transaction<'_, Sqlite>,
    command: &ReplaceAdminChannelGroupChannelBindingsCommand,
) -> DomainResult<Vec<AdminChannelGroupChannelBindingItem>> {
    let rows = sqlx::query(channel_binding_select_sql(
        r#"
        WHERE b.tenant_id = ?
          AND b.organization_id = ?
          AND b.channel_group_id = ?
          AND b.deleted_at IS NULL
        ORDER BY b.priority ASC, b.weight DESC, b.id ASC
        "#,
    ))
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.group_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to reload channel group channel bindings", error))?;
    rows.into_iter()
        .map(channel_binding_item_from_row)
        .collect()
}

async fn load_group_status(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    group_id: i64,
) -> DomainResult<i32> {
    let status: i32 = sqlx::query_scalar(
        r#"
        SELECT status
        FROM ai_channel_group
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(group_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel group status", error))?;
    Ok(status)
}

async fn ensure_group_exists(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    group_id: i64,
) -> DomainResult<()> {
    let exists: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel_group
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(group_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel group for channel binding", error))?;
    if exists == 0 {
        return Err(DomainError::not_found("channel group was not found"));
    }
    Ok(())
}

async fn ensure_channel_exists(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    channel_id: i64,
) -> DomainResult<()> {
    let exists: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(channel_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load AI channel for channel group binding", error))?;
    if exists == 0 {
        return Err(DomainError::not_found(format!(
            "AI channel was not found: {channel_id}"
        )));
    }
    Ok(())
}

async fn replace_group_resources_from_channel_bindings(
    tx: &mut Transaction<'_, Sqlite>,
    command: &ReplaceAdminChannelGroupChannelBindingsCommand,
    group_status: i32,
) -> DomainResult<()> {
    let resource_codes = command
        .items
        .iter()
        .flat_map(|item| item.resource_codes.iter())
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    replace_group_resource_access(
        tx,
        command.subject,
        command.group_id,
        &[],
        &resource_codes,
        group_status,
        &command.requested_at,
        RESOURCE_ACCESS_SOURCE_CHANNEL_BINDING,
        true,
    )
    .await
}

async fn replace_group_resource_access(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AdminChannelGroupSubject,
    group_id: i64,
    resource_group_codes: &[String],
    resource_codes: &[String],
    group_status: i32,
    requested_at: &str,
    source: &str,
    resource_codes_may_reference_groups: bool,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_channel_group_resource
        SET status = 0,
            deleted_at = ?,
            deleted_by = ?,
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE tenant_id = ?
          AND organization_id = ?
          AND channel_group_id = ?
          AND deleted_at IS NULL
          AND COALESCE(json_extract(COALESCE(NULLIF(metadata, ''), '{}'), '$.source'), 'channel_binding') = ?
        "#,
    )
    .bind(requested_at)
    .bind(subject.operator_id)
    .bind(requested_at)
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(group_id)
    .bind(source)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to clear channel group resources", error))?;

    let normalized_resource_group_codes = ordered_unique_codes(resource_group_codes);
    let normalized_resource_codes = ordered_unique_codes(resource_codes);

    for (index, requested_resource_group_code) in normalized_resource_group_codes.iter().enumerate()
    {
        let resource_group_id = resolve_resource_group_id(
            tx,
            subject.tenant_id,
            subject.organization_id,
            requested_resource_group_code,
        )
        .await?
        .ok_or_else(|| {
            DomainError::not_found(format!(
                "AI resource group was not found: {requested_resource_group_code}"
            ))
        })?;
        upsert_group_resource_access(
            tx,
            subject,
            group_id,
            None,
            "",
            Some(resource_group_id),
            requested_resource_group_code,
            (index as i64) + 1,
            group_status,
            requested_at,
            source,
        )
        .await?;
    }

    let resource_priority_base = normalized_resource_group_codes.len() as i64;
    for (index, requested_resource_code) in normalized_resource_codes.iter().enumerate() {
        if resource_codes_may_reference_groups {
            if let Some(resource_group_id) = resolve_resource_group_id(
                tx,
                subject.tenant_id,
                subject.organization_id,
                requested_resource_code,
            )
            .await?
            {
                upsert_group_resource_access(
                    tx,
                    subject,
                    group_id,
                    None,
                    "",
                    Some(resource_group_id),
                    requested_resource_code,
                    resource_priority_base + (index as i64) + 1,
                    group_status,
                    requested_at,
                    source,
                )
                .await?;
                continue;
            }
        }
        let resource_id = resolve_resource_id(
            tx,
            subject.tenant_id,
            subject.organization_id,
            requested_resource_code,
        )
        .await?
        .ok_or_else(|| {
            DomainError::not_found(format!(
                "AI resource was not found: {requested_resource_code}"
            ))
        })?;
        upsert_group_resource_access(
            tx,
            subject,
            group_id,
            Some(resource_id),
            requested_resource_code,
            None,
            "",
            resource_priority_base + (index as i64) + 1,
            group_status,
            requested_at,
            source,
        )
        .await?;
    }

    Ok(())
}

fn ordered_unique_codes(values: &[String]) -> Vec<String> {
    let mut seen = BTreeSet::new();
    let mut normalized = Vec::new();
    for value in values {
        let value = value.trim();
        if value.is_empty() {
            continue;
        }
        if seen.insert(value.to_owned()) {
            normalized.push(value.to_owned());
        }
    }
    normalized
}

async fn resolve_resource_group_id(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    group_code: &str,
) -> DomainResult<Option<i64>> {
    let row = sqlx::query(
        r#"
        SELECT id
        FROM ai_resource_group
        WHERE group_code = ?
          AND deleted_at IS NULL
          AND (
              (tenant_id = ? AND organization_id = ?)
              OR (tenant_id = 0 AND organization_id = 0)
          )
        ORDER BY CASE
            WHEN tenant_id = ? AND organization_id = ? THEN 0
            WHEN tenant_id = 0 AND organization_id = 0 THEN 1
            ELSE 2
          END,
          id ASC
        LIMIT 1
        "#,
    )
    .bind(group_code)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to resolve channel group resource group", error))?;
    Ok(row
        .as_ref()
        .and_then(|row| optional_integer_cell(row, "id")))
}

async fn resolve_resource_id(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    resource_code: &str,
) -> DomainResult<Option<i64>> {
    let row = sqlx::query(
        r#"
        SELECT id
        FROM ai_resource
        WHERE resource_code = ?
          AND deleted_at IS NULL
          AND (
              (tenant_id = ? AND organization_id = ?)
              OR (tenant_id = 0 AND organization_id = 0)
          )
        ORDER BY CASE
            WHEN tenant_id = ? AND organization_id = ? THEN 0
            WHEN tenant_id = 0 AND organization_id = 0 THEN 1
            ELSE 2
          END,
          id ASC
        LIMIT 1
        "#,
    )
    .bind(resource_code)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to resolve channel group resource", error))?;
    Ok(row
        .as_ref()
        .and_then(|row| optional_integer_cell(row, "id")))
}

#[allow(clippy::too_many_arguments)]
async fn upsert_group_resource_access(
    tx: &mut Transaction<'_, Sqlite>,
    subject: AdminChannelGroupSubject,
    group_id: i64,
    resource_id: Option<i64>,
    resource_code: &str,
    resource_group_id: Option<i64>,
    resource_group_code: &str,
    priority: i64,
    group_status: i32,
    requested_at: &str,
    source: &str,
) -> DomainResult<()> {
    let access_code = if resource_group_code.is_empty() {
        resource_code
    } else {
        resource_group_code
    };
    let resource_hash = digest_hex(&format!("{source}:{access_code}"));
    let persisted_status = relationship_status_for_group(group_status, 1);
    let metadata = relationship_metadata_for_group(group_status, 1, source);
    let resource_access_id = next_claw_runtime_id("ai_channel_group_resource")?;
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, channel_group_id, resource_id, resource_code, resource_group_id, resource_group_code, grant_type, priority, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'allow', ?, ?)
        ON CONFLICT(tenant_id, organization_id, channel_group_id, resource_code, resource_group_code)
        DO UPDATE SET
            status = excluded.status,
            deleted_at = NULL,
            deleted_by = NULL,
            updated_at = excluded.updated_at,
            resource_id = excluded.resource_id,
            resource_group_id = excluded.resource_group_id,
            grant_type = excluded.grant_type,
            priority = excluded.priority,
            metadata = excluded.metadata,
            version = COALESCE(ai_channel_group_resource.version, 0) + 1
        "#,
    )
    .bind(format!("ai-channel-group-resource-{group_id}-{resource_hash}"))
    .bind(subject.tenant_id)
    .bind(subject.organization_id)
    .bind(persisted_status)
    .bind(requested_at)
    .bind(requested_at)
    .bind(metadata)
    .bind(group_id)
    .bind(resource_id)
    .bind(resource_code)
    .bind(resource_group_id)
    .bind(resource_group_code)
    .bind(priority)
    .bind(resource_access_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to upsert channel group resource", error))?;
    Ok(())
}

async fn list_channel_groups(
    pool: &SqlitePool,
    query: ListAdminChannelGroupsQuery,
) -> DomainResult<AdminChannelGroupListPage> {
    let search = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_lowercase()));
    let sql = channel_group_select_sql(
        r#"
        WHERE g.tenant_id = ?
          AND g.organization_id = ?
          AND g.deleted_at IS NULL
          AND (? IS NULL OR g.id = ?)
          AND (
              ? IS NULL
              OR LOWER(COALESCE(g.group_name, g.group_code, '')) LIKE ?
              OR LOWER(COALESCE(g.group_code, '')) LIKE ?
          )
        ORDER BY g.updated_at DESC, g.id DESC
        LIMIT ? OFFSET ?
        "#,
    );
    let rows = sqlx::query(&sql)
        .bind(query.subject.tenant_id)
        .bind(query.subject.organization_id)
        .bind(query.group_id)
        .bind(query.group_id)
        .bind(search.as_deref())
        .bind(search.as_deref())
        .bind(search.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("failed to list channel groups", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(item_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminChannelGroupListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn find_default_pricing_plan(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<(i64, String)>> {
    let row = sqlx::query(
        r#"
        SELECT id, COALESCE(plan_code, '') AS plan_code
        FROM ai_pricing_plan
        WHERE status = 1
          AND deleted_at IS NULL
          AND (tenant_id = ? OR tenant_id = 0 OR tenant_id IS NULL)
          AND (organization_id = ? OR organization_id = 0 OR organization_id IS NULL)
        ORDER BY CASE
            WHEN tenant_id = ? AND organization_id = ? THEN 0
            WHEN tenant_id = ? AND organization_id = 0 THEN 1
            WHEN tenant_id = 0 AND organization_id = 0 THEN 2
            ELSE 3
          END,
          priority ASC,
          id ASC
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(tenant_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load default pricing plan", error))?;
    let Some(row) = row else {
        return Ok(None);
    };
    let id = row.try_get::<i64, _>("id").map_err(row_error)?;
    let code = row.try_get::<String, _>("plan_code").map_err(row_error)?;
    Ok(Some((id, code)))
}

async fn find_group_pricing_plan(
    tx: &mut Transaction<'_, Sqlite>,
    group_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<(i64, String)>> {
    let row = sqlx::query(
        r#"
        SELECT pricing_plan_id, COALESCE(pricing_plan_code, '') AS pricing_plan_code
        FROM ai_channel_group
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(group_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load group pricing plan", error))?;
    let Some(row) = row else {
        return Ok(None);
    };
    let Some(id) = optional_integer_cell(&row, "pricing_plan_id") else {
        return Ok(None);
    };
    let code = row
        .try_get::<Option<String>, _>("pricing_plan_code")
        .ok()
        .flatten()
        .unwrap_or_default();
    Ok(Some((id, code)))
}

async fn insert_channel_group(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAdminChannelGroupCommand,
    pricing_plan: Option<&(i64, String)>,
) -> DomainResult<i64> {
    let (pricing_plan_id, pricing_plan_code) = pricing_plan
        .map(|(id, code)| (Some(*id), Some(code.as_str())))
        .unwrap_or((None, None));
    let id = next_claw_runtime_id("ai_channel_group")?;
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, group_name, group_code, description, provider_code, group_type, environment, pricing_plan_id, pricing_plan_code, rate_multiplier, price_reference_mode, official_price_multiplier, billing_type, capacity_limit, allowed_origin, metadata, id)
        VALUES
            (?, ?, ?, 1, ?, ?, ?, 0, ?, ?, '', ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, '{}', '{}', ?)
        "#,
    )
    .bind(&command.group_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(&command.group_name)
    .bind(&command.group_code)
    .bind(&command.provider_code)
    .bind(&command.group_type)
    .bind(pricing_plan_id)
    .bind(pricing_plan_code)
    .bind(decimal_string(command.rate_multiplier))
    .bind(price_reference_mode_code(&command.price_reference_mode))
    .bind(decimal_string(command.official_price_multiplier))
    .bind(default_billing_type_code())
    .bind(command.capacity_total.round() as i64)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create channel group", error))?;

    Ok(id)
}

async fn update_channel_group(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateAdminChannelGroupCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE ai_channel_group
        SET group_name = COALESCE(?, group_name),
            group_code = COALESCE(?, group_code),
            provider_code = COALESCE(?, provider_code),
            price_reference_mode = COALESCE(?, price_reference_mode),
            rate_multiplier = COALESCE(?, rate_multiplier),
            official_price_multiplier = COALESCE(?, official_price_multiplier),
            group_type = COALESCE(?, group_type),
            capacity_limit = COALESCE(?, capacity_limit),
            status = COALESCE(?, status),
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.group_name.as_deref())
    .bind(command.group_code.as_deref())
    .bind(command.provider_code.as_deref())
    .bind(
        command
            .price_reference_mode
            .as_ref()
            .map(|value| price_reference_mode_code(value)),
    )
    .bind(command.rate_multiplier.map(decimal_string))
    .bind(command.official_price_multiplier.map(decimal_string))
    .bind(command.group_type.as_ref().map(String::as_str))
    .bind(command.capacity_total.map(|value| value.round() as i64))
    .bind(command.status.as_ref().map(|value| status_code(value)))
    .bind(&command.requested_at)
    .bind(command.group_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update channel group", error))?;

    Ok(result.rows_affected() > 0)
}

async fn sync_channel_group_relationship_status(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    group_id: i64,
    status: i32,
    requested_at: &str,
) -> DomainResult<()> {
    if status == 0 {
        sqlx::query(
            r#"
            UPDATE ai_channel_group_member
            SET status = 0,
                metadata = json_set(COALESCE(NULLIF(metadata, ''), '{}'), '$.disabledByParent', 1),
                updated_at = ?,
                version = COALESCE(version, 0) + 1
            WHERE tenant_id = ?
              AND organization_id = ?
              AND channel_group_id = ?
              AND status = 1
              AND deleted_at IS NULL
            "#,
        )
        .bind(requested_at)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(group_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to disable channel group members", error))?;

        sqlx::query(
            r#"
            UPDATE ai_channel_group_resource
            SET status = 0,
                metadata = json_set(COALESCE(NULLIF(metadata, ''), '{}'), '$.disabledByParent', 1),
                updated_at = ?,
                version = COALESCE(version, 0) + 1
            WHERE tenant_id = ?
              AND organization_id = ?
              AND channel_group_id = ?
              AND status = 1
              AND deleted_at IS NULL
            "#,
        )
        .bind(requested_at)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(group_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to disable channel group resources", error))?;
    } else if status == 1 {
        sqlx::query(
            r#"
            UPDATE ai_channel_group_member
            SET status = 1,
                metadata = json_remove(COALESCE(NULLIF(metadata, ''), '{}'), '$.disabledByParent'),
                updated_at = ?,
                version = COALESCE(version, 0) + 1
            WHERE tenant_id = ?
              AND organization_id = ?
              AND channel_group_id = ?
              AND status = 0
              AND deleted_at IS NULL
              AND json_extract(COALESCE(NULLIF(metadata, ''), '{}'), '$.disabledByParent') = 1
            "#,
        )
        .bind(requested_at)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(group_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to enable channel group members", error))?;

        sqlx::query(
            r#"
            UPDATE ai_channel_group_resource
            SET status = 1,
                metadata = json_remove(COALESCE(NULLIF(metadata, ''), '{}'), '$.disabledByParent'),
                updated_at = ?,
                version = COALESCE(version, 0) + 1
            WHERE tenant_id = ?
              AND organization_id = ?
              AND channel_group_id = ?
              AND status = 0
              AND deleted_at IS NULL
              AND json_extract(COALESCE(NULLIF(metadata, ''), '{}'), '$.disabledByParent') = 1
            "#,
        )
        .bind(requested_at)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(group_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to enable channel group resources", error))?;
    }

    Ok(())
}

fn relationship_status_for_group(group_status: i32, requested_status: i32) -> i32 {
    if group_status == 0 && requested_status == 1 {
        0
    } else {
        requested_status
    }
}

fn relationship_metadata_for_group(
    group_status: i32,
    requested_status: i32,
    source: &str,
) -> String {
    let mut metadata = serde_json::Map::new();
    metadata.insert(
        "source".to_owned(),
        serde_json::Value::String(source.to_owned()),
    );
    if group_status == 0 && requested_status == 1 {
        metadata.insert("disabledByParent".to_owned(), serde_json::Value::Bool(true));
    }
    serde_json::Value::Object(metadata).to_string()
}

fn channel_group_routing_config_change<'a>(
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    request_id: &'a str,
    requested_at: &'a str,
    action: &'a str,
    group_id: i64,
    event_payload: serde_json::Value,
) -> AiRoutingConfigChange<'a> {
    AiRoutingConfigChange {
        tenant_id,
        organization_id,
        operator_id,
        request_id,
        requested_at,
        changed_object_type: "ai_channel_group",
        changed_object_id: group_id,
        action,
        event_payload,
    }
}

async fn soft_delete_channel_group(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteAdminChannelGroupCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE ai_channel_group
        SET status = -1,
            deleted_at = ?,
            deleted_by = ?,
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.group_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete channel group", error))?;

    Ok(result.rows_affected() > 0)
}

async fn load_channel_group_by_id(
    tx: &mut Transaction<'_, Sqlite>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminChannelGroupItem>> {
    let sql = channel_group_select_sql(
        r#"
        WHERE g.id = ?
          AND g.tenant_id = ?
          AND g.organization_id = ?
          AND g.deleted_at IS NULL
        LIMIT 1
        "#,
    );
    let row = sqlx::query(&sql)
        .bind(id)
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("failed to load channel group", error))?;

    row.map(item_from_row).transpose()
}

async fn upsert_pricing_plan_binding(
    tx: &mut Transaction<'_, Sqlite>,
    binding_uuid: &str,
    tenant_id: i64,
    organization_id: i64,
    group_id: i64,
    group_code: &str,
    pricing_plan_id: i64,
    pricing_plan_code: &str,
    rate_multiplier: f64,
    requested_at: &str,
) -> DomainResult<()> {
    let updated = sqlx::query(
        r#"
        UPDATE ai_pricing_plan_binding
        SET status = 1,
            updated_at = ?,
            deleted_at = NULL,
            multiplier_override = ?,
            subject_code = ?,
            version = COALESCE(version, 0) + 1
        WHERE tenant_id = ?
          AND organization_id = ?
          AND subject_type = ?
          AND subject_id = ?
          AND pricing_plan_id = ?
        "#,
    )
    .bind(requested_at)
    .bind(decimal_string(rate_multiplier))
    .bind(group_code)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(CHANNEL_GROUP_SUBJECT_TYPE)
    .bind(group_id)
    .bind(pricing_plan_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update channel group pricing binding", error))?
    .rows_affected();

    if updated > 0 {
        return Ok(());
    }

    let pricing_binding_id = next_claw_runtime_id("ai_pricing_plan_binding")?;
    sqlx::query(
        r#"
        INSERT INTO ai_pricing_plan_binding
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, pricing_plan_id, pricing_plan_code, subject_type, subject_id, subject_code, binding_source, multiplier_override, priority, effective_from, id)
        VALUES
            (?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?)
        "#,
    )
    .bind(binding_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(requested_at)
    .bind(requested_at)
    .bind(pricing_plan_id)
    .bind(pricing_plan_code)
    .bind(CHANNEL_GROUP_SUBJECT_TYPE)
    .bind(group_id)
    .bind(group_code)
    .bind(decimal_string(rate_multiplier))
    .bind(requested_at)
    .bind(pricing_binding_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create channel group pricing binding", error))?;
    Ok(())
}

async fn soft_delete_group_bindings(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteAdminChannelGroupCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_pricing_plan_binding
        SET status = -1,
            deleted_at = ?,
            deleted_by = ?,
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE tenant_id = ?
          AND organization_id = ?
          AND subject_type = ?
          AND subject_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(CHANNEL_GROUP_SUBJECT_TYPE)
    .bind(command.group_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete channel group pricing bindings", error))?;

    sqlx::query(
        r#"
        UPDATE ai_channel_group_member
        SET status = -1,
            deleted_at = ?,
            deleted_by = ?,
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE tenant_id = ?
          AND organization_id = ?
          AND channel_group_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.group_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete channel group channel bindings", error))?;

    sqlx::query(
        r#"
        UPDATE ai_channel_group_resource
        SET status = -1,
            deleted_at = ?,
            deleted_by = ?,
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE tenant_id = ?
          AND organization_id = ?
          AND channel_group_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.group_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete channel group resources", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    audit_log_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    operator_type: i32,
    action: &'static str,
    target_id: i64,
    change_summary: serde_json::Value,
) -> DomainResult<()> {
    let id = next_claw_runtime_id("ops_audit_log")?;
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary, id)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(action)
    .bind(ACCESS_GROUP_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write channel group audit log", error))?;
    Ok(())
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Sqlite>,
    snapshot_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    action: &'static str,
    target_id: i64,
    payload: serde_json::Value,
    requested_at: &str,
) -> DomainResult<()> {
    let payload = payload.to_string();
    let snapshot_no = format!("access-group-{target_id}-{action}-{snapshot_uuid}");
    let id = next_claw_runtime_id("ops_config_snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by, id)
        VALUES
            (?, ?, ?, ?, ?, 1, ?, ?, ?, 'ai_channel_group', ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(snapshot_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(operator_id)
    .bind(request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_ACCESS_GROUP)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(requested_at)
    .bind(operator_id)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write channel group config snapshot", error))?;
    Ok(())
}

fn channel_group_select_sql(predicate: &str) -> String {
    format!(
        r#"
        SELECT
            g.id,
            g.uuid,
            g.tenant_id,
            g.organization_id,
            COALESCE(g.group_code, '') AS group_code,
            COALESCE(g.group_name, g.group_code, '') AS group_name,
            COALESCE(g.provider_code, '') AS provider_code,
            COALESCE(g.price_reference_mode, 1) AS price_reference_mode,
            CAST(COALESCE(g.rate_multiplier, 1) AS TEXT) AS rate_multiplier,
            CAST(COALESCE(g.official_price_multiplier, 1) AS TEXT) AS official_price_multiplier,
            g.group_type,
            COALESCE(m.channel_available_count, 0) AS account_available,
            COALESCE(m.channel_total_count, 0) AS account_total,
            CAST(COALESCE(m.capacity_used, 0) AS TEXT) AS capacity_used,
            CAST(COALESCE(m.capacity_limit, g.capacity_limit, 0) AS TEXT) AS capacity_total,
            CAST(COALESCE(m.usage_amount_today, 0) AS TEXT) AS usage_today,
            CAST(COALESCE(m.usage_amount_total, 0) AS TEXT) AS usage_total,
            COALESCE(
                (
                    SELECT json_group_array(selected.code)
                    FROM (
                        SELECT DISTINCT gr.resource_group_code AS code, gr.priority
                        FROM ai_channel_group_resource gr
                        WHERE gr.tenant_id = g.tenant_id
                          AND gr.organization_id = g.organization_id
                          AND gr.channel_group_id = g.id
                          AND gr.deleted_at IS NULL
                          AND NULLIF(gr.resource_group_code, '') IS NOT NULL
                          AND COALESCE(json_extract(COALESCE(NULLIF(gr.metadata, ''), '{{}}'), '$.source'), 'channel_binding') = 'group_form'
                        ORDER BY gr.priority ASC, gr.id ASC
                    ) selected
                ),
                '[]'
            ) AS resource_group_codes_json,
            COALESCE(
                (
                    SELECT json_group_array(selected.code)
                    FROM (
                        SELECT DISTINCT gr.resource_code AS code, gr.priority
                        FROM ai_channel_group_resource gr
                        WHERE gr.tenant_id = g.tenant_id
                          AND gr.organization_id = g.organization_id
                          AND gr.channel_group_id = g.id
                          AND gr.deleted_at IS NULL
                          AND NULLIF(gr.resource_code, '') IS NOT NULL
                          AND COALESCE(json_extract(COALESCE(NULLIF(gr.metadata, ''), '{{}}'), '$.source'), 'channel_binding') = 'group_form'
                        ORDER BY gr.priority ASC, gr.id ASC
                    ) selected
                ),
                '[]'
            ) AS resource_codes_json,
            g.status,
            CAST(g.deleted_at AS TEXT) AS deleted_at,
            COUNT(*) OVER() AS total
        FROM ai_channel_group g
        LEFT JOIN ai_channel_group_metric_snapshot m
          ON m.id = (
              SELECT latest.id
              FROM ai_channel_group_metric_snapshot latest
              WHERE latest.tenant_id = g.tenant_id
                AND latest.organization_id = g.organization_id
                AND latest.channel_group_id = g.id
                AND latest.status = 1
              ORDER BY latest.snapshot_at DESC, latest.id DESC
              LIMIT 1
          )
        {predicate}
        "#
    )
}

fn item_from_row(row: sqlx::sqlite::SqliteRow) -> DomainResult<AdminChannelGroupItem> {
    Ok(AdminChannelGroupItem {
        id: row.try_get("id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        group_code: row.try_get("group_code").map_err(row_error)?,
        group_name: row.try_get("group_name").map_err(row_error)?,
        provider_code: row.try_get("provider_code").map_err(row_error)?,
        price_reference_mode: price_reference_mode_label(required_integer_cell(
            &row,
            "price_reference_mode",
            "price_reference_mode",
        )?)?,
        rate_multiplier: decimal_cell(&row, "rate_multiplier"),
        official_price_multiplier: decimal_cell(&row, "official_price_multiplier"),
        group_type: group_type_cell(&row)?,
        account_available: optional_integer_cell(&row, "account_available").unwrap_or(0),
        account_total: optional_integer_cell(&row, "account_total").unwrap_or(0),
        capacity_used: decimal_cell(&row, "capacity_used"),
        capacity_total: decimal_cell(&row, "capacity_total"),
        usage_today: decimal_cell(&row, "usage_today"),
        usage_total: decimal_cell(&row, "usage_total"),
        resource_group_codes: json_string_array_cell(&row, "resource_group_codes_json")?,
        resource_codes: json_string_array_cell(&row, "resource_codes_json")?,
        status: status_label(required_integer_cell(&row, "status", "status")?)?,
        deleted_at: row.try_get("deleted_at").ok().flatten(),
    })
}

fn channel_binding_select_sql(predicate: &str) -> &'static str {
    let _ = predicate;
    r#"
        SELECT
            b.id,
            b.uuid,
            b.tenant_id,
            b.organization_id,
            b.channel_group_id AS group_id,
            b.channel_id,
            COALESCE(c.channel_name, c.channel_code, '') AS channel_name,
            COALESCE(c.provider_code, '') AS provider_code,
            COALESCE(p.display_name, p.provider_code, c.provider_code, '') AS provider_name,
            COALESCE(c.channel_code, '') AS channel_code,
            COALESCE(
                (
                    SELECT json_group_array(selected.code)
                    FROM (
                        SELECT DISTINCT COALESCE(NULLIF(gr.resource_code, ''), gr.resource_group_code) AS code
                        FROM ai_channel_group_resource gr
                        LEFT JOIN ai_resource r
                          ON r.resource_code = gr.resource_code
                         AND r.tenant_id = gr.tenant_id
                         AND r.organization_id = gr.organization_id
                         AND r.deleted_at IS NULL
                        LEFT JOIN ai_resource_group rg
                          ON rg.group_code = gr.resource_group_code
                         AND rg.tenant_id = gr.tenant_id
                         AND rg.organization_id = gr.organization_id
                         AND rg.deleted_at IS NULL
                        WHERE gr.channel_group_id = b.channel_group_id
                          AND gr.tenant_id = b.tenant_id
                          AND gr.organization_id = b.organization_id
                          AND gr.deleted_at IS NULL
                          AND gr.status = 1
                          AND COALESCE(NULLIF(gr.resource_code, ''), gr.resource_group_code, '') <> ''
                        ORDER BY code
                    ) selected
                ),
                '[]'
            ) AS resource_codes_json,
            COALESCE(
                (
                    SELECT json_group_array(selected.code)
                    FROM (
                        SELECT DISTINCT COALESCE(r.api_code, NULLIF(gr.resource_code, ''), gr.resource_group_code) AS code
                        FROM ai_channel_group_resource gr
                        LEFT JOIN ai_resource r
                          ON r.resource_code = gr.resource_code
                         AND r.tenant_id = gr.tenant_id
                         AND r.organization_id = gr.organization_id
                         AND r.deleted_at IS NULL
                        LEFT JOIN ai_resource_group rg
                          ON rg.group_code = gr.resource_group_code
                         AND rg.tenant_id = gr.tenant_id
                         AND rg.organization_id = gr.organization_id
                         AND rg.deleted_at IS NULL
                        WHERE gr.channel_group_id = b.channel_group_id
                          AND gr.tenant_id = b.tenant_id
                          AND gr.organization_id = b.organization_id
                          AND gr.deleted_at IS NULL
                          AND gr.status = 1
                          AND COALESCE(NULLIF(gr.resource_code, ''), gr.resource_group_code, '') <> ''
                          AND (
                              COALESCE(r.resource_type, rg.group_type, '') = 'api_endpoint'
                              OR COALESCE(NULLIF(r.api_code, ''), NULLIF(gr.resource_code, ''), gr.resource_group_code, '') LIKE 'api.%'
                              OR COALESCE(NULLIF(r.api_code, ''), NULLIF(gr.resource_code, ''), gr.resource_group_code, '') LIKE '%.%_%'
                          )
                        ORDER BY code
                    ) selected
                ),
                '[]'
            ) AS api_scope_json,
            COALESCE(
                (
                    SELECT json_group_array(selected.code)
                    FROM (
                        SELECT DISTINCT COALESCE(NULLIF(r.modality_code, ''), NULLIF(gr.resource_code, ''), gr.resource_group_code) AS code
                        FROM ai_channel_group_resource gr
                        LEFT JOIN ai_resource r
                          ON r.resource_code = gr.resource_code
                         AND r.tenant_id = gr.tenant_id
                         AND r.organization_id = gr.organization_id
                         AND r.deleted_at IS NULL
                        LEFT JOIN ai_resource_group rg
                          ON rg.group_code = gr.resource_group_code
                         AND rg.tenant_id = gr.tenant_id
                         AND rg.organization_id = gr.organization_id
                         AND rg.deleted_at IS NULL
                        WHERE gr.channel_group_id = b.channel_group_id
                          AND gr.tenant_id = b.tenant_id
                          AND gr.organization_id = b.organization_id
                          AND gr.deleted_at IS NULL
                          AND gr.status = 1
                          AND COALESCE(NULLIF(gr.resource_code, ''), gr.resource_group_code, '') <> ''
                          AND (
                              COALESCE(r.resource_type, rg.group_type, '') = 'modality'
                              OR (
                                  COALESCE(r.resource_type, rg.group_type, '') NOT IN ('model', 'model_api', 'api_endpoint')
                                  AND COALESCE(NULLIF(gr.resource_code, ''), gr.resource_group_code, '') NOT LIKE 'api.%'
                                  AND COALESCE(NULLIF(gr.resource_code, ''), gr.resource_group_code, '') NOT LIKE '%.%'
                                  AND COALESCE(NULLIF(gr.resource_code, ''), gr.resource_group_code, '') NOT LIKE '%/%'
                              )
                          )
                        ORDER BY code
                    ) selected
                ),
                '[]'
            ) AS capabilities_json,
            COALESCE(b.priority, c.priority, 100) AS priority,
            COALESCE(b.weight, c.weight, 100) AS weight,
            b.status,
            COALESCE(c.health_status, 1) AS health_status,
            CAST(b.deleted_at AS TEXT) AS deleted_at
        FROM ai_channel_group_member b
        JOIN ai_channel c
          ON c.id = b.channel_id
         AND c.tenant_id = b.tenant_id
         AND c.organization_id = b.organization_id
         AND c.deleted_at IS NULL
        LEFT JOIN ai_provider p
          ON p.provider_code = c.provider_code
         AND p.deleted_at IS NULL
         AND (
             (p.tenant_id = c.tenant_id AND p.organization_id = c.organization_id)
             OR (p.tenant_id = 0 AND p.organization_id = 0)
             OR (p.tenant_id IS NULL AND p.organization_id IS NULL)
         )
        WHERE b.tenant_id = ?
          AND b.organization_id = ?
          AND b.channel_group_id = ?
          AND b.deleted_at IS NULL
        ORDER BY b.priority ASC, b.weight DESC, b.id ASC
        "#
}

fn channel_binding_item_from_row(
    row: sqlx::sqlite::SqliteRow,
) -> DomainResult<AdminChannelGroupChannelBindingItem> {
    Ok(AdminChannelGroupChannelBindingItem {
        id: row.try_get("id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        group_id: row.try_get("group_id").map_err(row_error)?,
        channel_id: row.try_get("channel_id").map_err(row_error)?,
        channel_name: row.try_get("channel_name").map_err(row_error)?,
        provider_code: row.try_get("provider_code").map_err(row_error)?,
        provider_name: row.try_get("provider_name").map_err(row_error)?,
        channel_code: row.try_get("channel_code").map_err(row_error)?,
        resource_codes: json_string_array_cell(&row, "resource_codes_json")?,
        api_scope: json_string_array_cell(&row, "api_scope_json")?,
        capabilities: json_string_array_cell(&row, "capabilities_json")?,
        priority: optional_integer_cell(&row, "priority").unwrap_or(100),
        weight: optional_integer_cell(&row, "weight").unwrap_or(100),
        status: status_label(required_integer_cell(&row, "status", "status")?)?,
        health_status: channel_health_status_label(
            optional_integer_cell(&row, "health_status").unwrap_or(1),
        )?,
        deleted_at: row.try_get("deleted_at").ok().flatten(),
    })
}

fn channel_health_status_label(value: i64) -> DomainResult<String> {
    match value {
        1 => Ok("active".to_owned()),
        2 => Ok("error".to_owned()),
        value => Err(DomainError::new(format!(
            "invalid admin channel group channel health_status from database row: {value}"
        ))),
    }
}

fn price_reference_mode_code(value: &str) -> i32 {
    if value == "official_price" {
        2
    } else {
        1
    }
}

fn default_billing_type_code() -> i32 {
    1
}

fn price_reference_mode_label(value: i64) -> DomainResult<String> {
    match value {
        1 => Ok("multiplier"),
        2 => Ok("official_price"),
        value => Err(DomainError::new(format!(
            "invalid admin channel group price_reference_mode from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn group_type_cell(row: &sqlx::sqlite::SqliteRow) -> DomainResult<String> {
    if let Ok(Some(value)) = row.try_get::<Option<String>, _>("group_type") {
        return match value.as_str() {
            "public" | "dedicated" => Ok(value),
            "1" => Ok("public".to_owned()),
            "2" => Ok("dedicated".to_owned()),
            value => Err(DomainError::new(format!(
                "invalid admin channel group group_type from database row: {value}"
            ))),
        };
    }
    let value = required_integer_cell(row, "group_type", "group_type")?;
    match value {
        1 => Ok("public".to_owned()),
        2 => Ok("dedicated".to_owned()),
        value => Err(DomainError::new(format!(
            "invalid admin channel group group_type from database row: {value}"
        ))),
    }
}

fn status_code(value: &str) -> i32 {
    if value == "disabled" {
        0
    } else {
        1
    }
}

fn status_label(value: i64) -> DomainResult<String> {
    match value {
        0 => Ok("disabled"),
        1 => Ok("active"),
        value => Err(DomainError::new(format!(
            "invalid admin channel group status from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn decimal_string(value: f64) -> String {
    format!("{value:.6}")
}

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn decimal_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> f64 {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .and_then(|value| value.parse::<f64>().ok())
        .or_else(|| row.try_get::<Option<f64>, _>(column).ok().flatten())
        .unwrap_or(0.0)
}

fn json_string_array_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> DomainResult<Vec<String>> {
    let value = row
        .try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_else(|| "[]".to_owned());
    serde_json::from_str::<Vec<String>>(&value)
        .map_err(|error| DomainError::new(format!("invalid {column} JSON array: {error}")))
}

fn optional_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
}

fn required_integer_cell(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
    field: &str,
) -> DomainResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| missing_integer_cell_error(field))
}

fn missing_integer_cell_error(field: &str) -> DomainError {
    match field {
        "price_reference_mode" => {
            DomainError::new("missing admin channel group price_reference_mode from database row")
        }
        "group_type" => {
            DomainError::new("missing admin channel group group_type from database row")
        }
        "status" => DomainError::new("missing admin channel group status from database row"),
        _ => DomainError::new(format!(
            "missing admin channel group {field} from database row"
        )),
    }
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    if let sqlx::Error::Database(database_error) = &error {
        let message = database_error.message();
        if message.contains("UNIQUE")
            || database_error
                .code()
                .map(|code| code == "23505")
                .unwrap_or(false)
        {
            return DomainError::conflict(format!("{context}: channel group already exists"));
        }
    }
    redacted_store_error(context, error)
}
