use std::sync::Arc;

use sha2::{Digest, Sha256};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AppRoutingChannelCommandFuture, AppRoutingChannelCommandStore, AppRoutingChannelDeleteOutcome,
    AppRoutingChannelItem, AppRoutingChannelMutationOutcome, AppRoutingChannelTestOutcome,
    AppRoutingRetryPolicyItem, CreateAppRoutingChannelCommand, DeleteAppRoutingChannelCommand,
    ProviderHealthProbe, ProviderHealthProbeOutcome, ProviderHealthProbeRequest,
    SetAppRoutingChannelStatusCommand, TestAppRoutingChannelCommand,
    UnconfiguredProviderHealthProbe, UpdateAppRoutingChannelCommand,
};

const CHANNEL_TARGET_TYPE: i32 = 10;
const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_CHANNEL: i32 = 20;

#[derive(Clone)]
pub struct SqliteAppRoutingChannelCommandStore {
    pool: SqlitePool,
    provider_health_probe: Arc<dyn ProviderHealthProbe + Send + Sync>,
}

impl std::fmt::Debug for SqliteAppRoutingChannelCommandStore {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("SqliteAppRoutingChannelCommandStore")
            .field("pool", &self.pool)
            .field("provider_health_probe", &"[configured]")
            .finish()
    }
}

impl SqliteAppRoutingChannelCommandStore {
    pub fn new(pool: SqlitePool) -> Self {
        Self::with_provider_health_probe(pool, Arc::new(UnconfiguredProviderHealthProbe))
    }

    pub fn with_provider_health_probe(
        pool: SqlitePool,
        provider_health_probe: Arc<dyn ProviderHealthProbe + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            provider_health_probe,
        }
    }
}

impl AppRoutingChannelCommandStore for SqliteAppRoutingChannelCommandStore {
    fn create_channel<'a>(
        &'a self,
        command: CreateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelMutationOutcome> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin routing channel transaction", error)
            })?;
            let provider_id = insert_or_load_provider(&mut tx, &command).await?;
            let account_id = insert_channel(&mut tx, &command, provider_id).await?;
            replace_channel_credential(&mut tx, account_id, &command).await?;
            replace_channel_resource_bindings(
                &mut tx,
                account_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.user_id,
                &command.supplier_code,
                &command.capabilities,
                &command.requested_at,
            )
            .await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.user_id,
                "create_channel",
                account_id,
                &channel_snapshot_payload(account_id, &command.name, &command.supplier_code),
                &command.requested_at,
            )
            .await?;
            insert_audit_log(
                &mut tx,
                &command.audit_log_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.user_id,
                "create_channel",
                account_id,
                serde_json::json!({
                    "action": "create_channel",
                    "channelId": account_id,
                    "name": &command.name,
                    "providerCode": &command.supplier_code,
                    "capabilities": &command.capabilities,
                    "timeoutMs": command.timeout_ms,
                    "retryPolicyConfigured": command.retry_policy_json.is_some(),
                    "circuitBreakerPolicyConfigured": command.circuit_breaker_policy_json.is_some(),
                    "secretStoredAsRef": true
                }),
            )
            .await?;
            let item = load_channel_by_id(
                &mut tx,
                account_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created routing channel could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit routing channel transaction", error)
            })?;
            Ok(AppRoutingChannelMutationOutcome { item })
        })
    }

    fn update_channel<'a>(
        &'a self,
        command: UpdateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin routing channel transaction", error)
            })?;
            let provider_id = match command.supplier_code.as_deref() {
                Some(supplier_code) => Some(
                    insert_or_load_provider_for_code(
                        &mut tx,
                        command.subject.tenant_id,
                        command.subject.organization_id,
                        &command.provider_uuid,
                        supplier_code,
                        command.vendor.as_deref().unwrap_or(supplier_code),
                        command.base_url.as_ref().and_then(|value| value.as_deref()),
                        &command.requested_at,
                    )
                    .await?,
                ),
                None => None,
            };
            let updated = update_channel(&mut tx, &command, provider_id).await?;
            if !updated {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit routing channel transaction", error)
                })?;
                return Ok(None);
            }
            update_provider_account(&mut tx, &command, provider_id).await?;
            if command.capabilities.is_some()
                || command.supplier_code.is_some()
                || command.vendor.is_some()
            {
                let supplier_code = if let Some(supplier_code) = command.supplier_code.clone() {
                    supplier_code
                } else {
                    load_channel_supplier_code(
                        &mut tx,
                        command.account_id,
                        command.subject.tenant_id,
                        command.subject.organization_id,
                    )
                    .await?
                };
                let capabilities = command
                    .capabilities
                    .as_deref()
                    .map(Vec::from)
                    .unwrap_or_else(|| vec!["llm".to_owned()]);
                replace_channel_resource_bindings(
                    &mut tx,
                    command.account_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.user_id,
                    &supplier_code,
                    &capabilities,
                    &command.requested_at,
                )
                .await?;
            }
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.user_id,
                "update_channel",
                command.account_id,
                &serde_json::json!({
                    "channelId": command.account_id,
                    "name": command.name,
                    "providerCode": command.supplier_code,
                    "timeoutChanged": command.timeout_ms.is_some(),
                    "retryPolicyChanged": command.retry_policy_json.is_some(),
                    "circuitBreakerPolicyChanged": command.circuit_breaker_policy_json.is_some(),
                    "secretRefChanged": command.secret_ref.is_some()
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
                command.subject.user_id,
                "update_channel",
                command.account_id,
                serde_json::json!({
                    "action": "update_channel",
                    "channelId": command.account_id,
                    "timeoutChanged": command.timeout_ms.is_some(),
                    "retryPolicyChanged": command.retry_policy_json.is_some(),
                    "circuitBreakerPolicyChanged": command.circuit_breaker_policy_json.is_some(),
                    "secretRefChanged": command.secret_ref.is_some(),
                    "status": command.status
                }),
            )
            .await?;
            let item = load_channel_by_id(
                &mut tx,
                command.account_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("updated routing channel could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit routing channel transaction", error)
            })?;
            Ok(Some(AppRoutingChannelMutationOutcome { item }))
        })
    }

    fn set_channel_status<'a>(
        &'a self,
        command: SetAppRoutingChannelStatusCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin routing channel transaction", error)
            })?;
            let updated = update_channel_status(&mut tx, &command).await?;
            if !updated {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit routing channel transaction", error)
                })?;
                return Ok(None);
            }
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.user_id,
                "set_channel_status",
                command.account_id,
                &serde_json::json!({
                    "channelId": command.account_id,
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
                command.subject.user_id,
                "set_channel_status",
                command.account_id,
                serde_json::json!({
                    "action": "set_channel_status",
                    "channelId": command.account_id,
                    "status": &command.status
                }),
            )
            .await?;
            let item = load_channel_by_id(
                &mut tx,
                command.account_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("updated routing channel could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit routing channel transaction", error)
            })?;
            Ok(Some(AppRoutingChannelMutationOutcome { item }))
        })
    }

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelDeleteOutcome> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin routing channel transaction", error)
            })?;
            let deleted = soft_delete_channel(&mut tx, &command).await?;
            if deleted {
                soft_delete_channel_relationships(&mut tx, &command).await?;
                insert_config_snapshot(
                    &mut tx,
                    &command.config_snapshot_uuid,
                    &command.request_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.user_id,
                    "delete_channel",
                    command.account_id,
                    &serde_json::json!({
                        "channelId": command.account_id,
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
                    command.subject.user_id,
                    "delete_channel",
                    command.account_id,
                    serde_json::json!({
                        "action": "delete_channel",
                        "channelId": command.account_id
                    }),
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit routing channel transaction", error)
            })?;
            Ok(AppRoutingChannelDeleteOutcome { deleted })
        })
    }

    fn test_channel<'a>(
        &'a self,
        command: TestAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelTestOutcome>> {
        Box::pin(async move {
            let probe_target = {
                let mut tx = self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin routing channel transaction", error)
                })?;
                let probe_target = load_channel_probe_target(&mut tx, &command).await?;
                tx.commit().await.map_err(|error| {
                    store_error(
                        "failed to commit routing channel probe target transaction",
                        error,
                    )
                })?;
                match probe_target {
                    Some(probe_target) => probe_target,
                    None => return Ok(None),
                }
            };
            let probe_outcome = self
                .provider_health_probe
                .probe_provider_health(ProviderHealthProbeRequest {
                    provider_base_url: probe_target.provider_base_url.clone(),
                    provider_secret_ref: probe_target.provider_secret_ref.clone(),
                    provider_secret_value: None,
                    provider_model: probe_target.provider_model.clone(),
                    provider_timeout_ms: probe_target.provider_timeout_ms,
                })
                .await?;
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin routing channel transaction", error)
            })?;
            let updated =
                record_channel_health_test(&mut tx, &command, &probe_target, &probe_outcome)
                    .await?;
            if !updated {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit routing channel transaction", error)
                })?;
                return Ok(None);
            }
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.user_id,
                "test_channel",
                command.account_id,
                &serde_json::json!({
                    "channelId": command.account_id,
                    "success": probe_outcome.success,
                    "healthStatus": if probe_outcome.success { "healthy" } else { "error" },
                    "httpStatus": probe_outcome.http_status
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
                command.subject.user_id,
                "test_channel",
                command.account_id,
                serde_json::json!({
                    "action": "test_channel",
                    "channelId": command.account_id,
                    "success": probe_outcome.success,
                    "healthStatus": if probe_outcome.success { "healthy" } else { "error" },
                    "httpStatus": probe_outcome.http_status
                }),
            )
            .await?;
            let item = load_channel_by_id(
                &mut tx,
                command.account_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("tested routing channel could not be reloaded"))?;
            let outcome = AppRoutingChannelTestOutcome {
                account_id: item.id.clone(),
                success: probe_outcome.success,
                status: item.status.clone(),
                latency: item.latency.clone(),
                item,
            };
            tx.commit().await.map_err(|error| {
                store_error("failed to commit routing channel transaction", error)
            })?;
            Ok(Some(outcome))
        })
    }
}

async fn insert_or_load_provider(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAppRoutingChannelCommand,
) -> DomainResult<i64> {
    insert_or_load_provider_for_code(
        tx,
        command.subject.tenant_id,
        command.subject.organization_id,
        &command.provider_uuid,
        &command.supplier_code,
        &command.vendor,
        command.base_url.as_deref(),
        &command.requested_at,
    )
    .await
}

async fn insert_or_load_provider_for_code(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    provider_uuid: &str,
    supplier_code: &str,
    vendor: &str,
    base_url: Option<&str>,
    requested_at: &str,
) -> DomainResult<i64> {
    if let Some(provider_id) = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT id
        FROM ai_provider
        WHERE supplier_code = ?
          AND (
              (tenant_id = ? AND organization_id = ?)
              OR (tenant_id = 0 AND organization_id = 0)
              OR (tenant_id IS NULL AND organization_id IS NULL)
          )
          AND deleted_at IS NULL
        ORDER BY CASE WHEN tenant_id = ? AND organization_id = ? THEN 0 ELSE 1 END, id ASC
        LIMIT 1
        "#,
    )
    .bind(supplier_code)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load routing channel provider", error))?
    {
        return Ok(provider_id);
    }

    let provider_id = next_claw_runtime_id("routing channel provider creation")?;
    sqlx::query(
        r#"
        INSERT INTO ai_provider
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, supplier_code, default_vendor_code, display_name, base_url, sort_order)
        VALUES
            (?, ?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, 100)
        "#,
    )
    .bind(provider_id)
    .bind(provider_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(requested_at)
    .bind(requested_at)
    .bind(supplier_code)
    .bind(supplier_code)
    .bind(vendor)
    .bind(base_url)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create routing channel provider", error))?;

    Ok(provider_id)
}

async fn insert_channel(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateAppRoutingChannelCommand,
    provider_id: i64,
) -> DomainResult<i64> {
    let auth_config = serde_json::json!({
        "accessType": &command.access_type,
        "protocol": &command.protocol
    })
    .to_string();
    let account_id = next_claw_runtime_id("routing channel creation")?;
    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, provider_id, supplier_code, account_code, channel_name, channel_type, protocol_code, auth_type, base_url, auth_config, credential_ref, credential_hash, masked_label, timeout_ms, retry_policy, circuit_breaker_policy, environment, priority, weight, health_status, last_latency_ms, rpm_limit, consecutive_error_count)
        VALUES
            (?, ?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?, ?, 'official', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 100, ?, ?, 0, 0, 0)
        "#,
    )
    .bind(account_id)
    .bind(&command.channel_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(provider_id)
    .bind(&command.supplier_code)
    .bind(entity_code("chn", &command.channel_uuid))
    .bind(&command.name)
    .bind(protocol_storage_code(&command.protocol))
    .bind(access_type_code(&command.access_type))
    .bind(command.base_url.as_deref())
    .bind(auth_config)
    .bind(&command.secret_ref)
    .bind(digest_hex(&command.secret_ref))
    .bind(mask_secret_ref(&command.secret_ref))
    .bind(command.timeout_ms)
    .bind(command.retry_policy_json.as_deref())
    .bind(command.circuit_breaker_policy_json.as_deref())
    .bind(command.weight)
    .bind(health_status_code(&command.status))
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create routing channel", error))?;

    Ok(account_id)
}

async fn update_channel(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateAppRoutingChannelCommand,
    provider_id: Option<i64>,
) -> DomainResult<bool> {
    let base_url_touched = command.base_url.is_some();
    let base_url = command.base_url.as_ref().and_then(|value| value.as_deref());
    let timeout_touched = command.timeout_ms.is_some();
    let timeout_ms = command.timeout_ms.flatten();
    let retry_policy_touched = command.retry_policy_json.is_some();
    let retry_policy_json = command
        .retry_policy_json
        .as_ref()
        .and_then(|value| value.as_deref());
    let circuit_breaker_policy_touched = command.circuit_breaker_policy_json.is_some();
    let circuit_breaker_policy_json = command
        .circuit_breaker_policy_json
        .as_ref()
        .and_then(|value| value.as_deref());
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
        SET channel_name = COALESCE(?, channel_name),
            provider_id = COALESCE(?, provider_id),
            supplier_code = COALESCE(?, supplier_code),
            protocol_code = COALESCE(?, protocol_code),
            auth_type = COALESCE(?, auth_type),
            base_url = CASE WHEN ? THEN ? ELSE base_url END,
            timeout_ms = CASE WHEN ? THEN ? ELSE timeout_ms END,
            retry_policy = CASE WHEN ? THEN ? ELSE retry_policy END,
            circuit_breaker_policy = CASE WHEN ? THEN ? ELSE circuit_breaker_policy END,
            weight = COALESCE(?, weight),
            status = COALESCE(?, status),
            health_status = COALESCE(?, health_status),
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.name.as_deref())
    .bind(provider_id)
    .bind(command.supplier_code.as_deref())
    .bind(
        command
            .protocol
            .as_ref()
            .map(|value| protocol_storage_code(value)),
    )
    .bind(
        command
            .access_type
            .as_ref()
            .map(|value| access_type_code(value)),
    )
    .bind(base_url_touched)
    .bind(base_url)
    .bind(timeout_touched)
    .bind(timeout_ms)
    .bind(retry_policy_touched)
    .bind(retry_policy_json)
    .bind(circuit_breaker_policy_touched)
    .bind(circuit_breaker_policy_json)
    .bind(command.weight)
    .bind(command.status.as_ref().map(|value| status_code(value)))
    .bind(
        command
            .status
            .as_ref()
            .map(|value| health_status_code(value)),
    )
    .bind(&command.requested_at)
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update routing channel", error))?;
    Ok(result.rows_affected() > 0)
}

async fn update_provider_account(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateAppRoutingChannelCommand,
    provider_id: Option<i64>,
) -> DomainResult<()> {
    if command.secret_ref.is_none()
        && command.supplier_code.is_none()
        && command.name.is_none()
        && command.base_url.is_none()
        && command.status.is_none()
        && provider_id.is_none()
    {
        return Ok(());
    }
    let secret_hash = command
        .secret_ref
        .as_ref()
        .map(|secret_ref| digest_hex(secret_ref));
    let masked_label = command
        .secret_ref
        .as_ref()
        .map(|secret_ref| mask_secret_ref(secret_ref));
    sqlx::query(
        r#"
        UPDATE ai_channel
        SET provider_id = COALESCE(?, provider_id),
            supplier_code = COALESCE(?, supplier_code),
            channel_name = COALESCE(?, channel_name),
            credential_ref = COALESCE(?, credential_ref),
            credential_hash = COALESCE(?, credential_hash),
            masked_label = COALESCE(?, masked_label),
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(provider_id)
    .bind(command.supplier_code.as_deref())
    .bind(command.name.as_deref())
    .bind(command.secret_ref.as_deref())
    .bind(secret_hash)
    .bind(masked_label)
    .bind(&command.requested_at)
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update routing channel provider account", error))?;
    update_primary_channel_credential(tx, command).await?;
    Ok(())
}

async fn update_primary_channel_credential(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateAppRoutingChannelCommand,
) -> DomainResult<()> {
    let base_url_touched = command.base_url.is_some();
    let base_url = command.base_url.as_ref().and_then(|value| value.as_deref());
    let secret_hash = command
        .secret_ref
        .as_ref()
        .map(|secret_ref| digest_hex(secret_ref));
    let masked_label = command
        .secret_ref
        .as_ref()
        .map(|secret_ref| mask_secret_ref(secret_ref));
    sqlx::query(
        r#"
        UPDATE ai_channel_credential
        SET supplier_code = COALESCE(?, supplier_code),
            base_url = CASE WHEN ? THEN COALESCE(?, '') ELSE base_url END,
            credential_ref = COALESCE(?, credential_ref),
            credential_hash = COALESCE(?, credential_hash),
            masked_label = COALESCE(?, masked_label),
            health_status = COALESCE(?, health_status),
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE account_id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND credential_name = 'primary'
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.supplier_code.as_deref())
    .bind(base_url_touched)
    .bind(base_url)
    .bind(command.secret_ref.as_deref())
    .bind(secret_hash)
    .bind(masked_label)
    .bind(
        command
            .status
            .as_ref()
            .map(|value| health_status_code(value)),
    )
    .bind(&command.requested_at)
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update routing channel credential", error))?;
    Ok(())
}

async fn update_channel_status(
    tx: &mut Transaction<'_, Sqlite>,
    command: &SetAppRoutingChannelStatusCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
        SET status = ?,
            health_status = ?,
            consecutive_error_count = CASE WHEN ? = 1 THEN 0 ELSE consecutive_error_count END,
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(status_code(&command.status))
    .bind(health_status_code(&command.status))
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update routing channel status", error))?;
    Ok(result.rows_affected() > 0)
}

async fn replace_channel_credential(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: i64,
    command: &CreateAppRoutingChannelCommand,
) -> DomainResult<()> {
    let auth_config = serde_json::json!({
        "accessType": &command.access_type,
        "protocol": &command.protocol,
        "credentialSource": "externalSecretRef"
    })
    .to_string();
    let credential_id = next_claw_runtime_id("routing channel credential creation")?;
    sqlx::query(
        r#"
        INSERT INTO ai_channel_credential
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, account_id, supplier_code, account_code, credential_name, base_url, auth_config, credential_ref, credential_hash, masked_label, priority, weight, health_status, consecutive_error_count)
        VALUES
            (?, ?, ?, ?, 1, ?, ?, ?, 0, '{}', ?, ?, (
                SELECT COALESCE(NULLIF(account_code, ''), '')
                FROM ai_channel
                WHERE id = ?
            ), 'primary', ?, ?, ?, ?, ?, 1, 100, ?, 0)
        "#,
    )
    .bind(credential_id)
    .bind(&command.account_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(account_id)
    .bind(&command.supplier_code)
    .bind(account_id)
    .bind(command.base_url.as_deref().unwrap_or_default())
    .bind(auth_config)
    .bind(&command.secret_ref)
    .bind(digest_hex(&command.secret_ref))
    .bind(mask_secret_ref(&command.secret_ref))
    .bind(health_status_code(&command.status))
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create routing channel credential", error))?;
    Ok(())
}

async fn replace_channel_resource_bindings(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: i64,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    supplier_code: &str,
    capabilities: &[String],
    requested_at: &str,
) -> DomainResult<()> {
    let account_code = load_account_code(tx, account_id, tenant_id, organization_id).await?;
    let mut resource_codes = Vec::<String>::new();
    push_unique(&mut resource_codes, &format!("vendor.{supplier_code}"));
    for capability in capabilities {
        if let Some(resource_code) = capability_resource_code(capability) {
            push_unique(&mut resource_codes, &resource_code);
        }
    }
    soft_delete_removed_channel_resources(
        tx,
        account_id,
        tenant_id,
        organization_id,
        user_id,
        &resource_codes,
        requested_at,
    )
    .await?;
    for (index, resource_code) in resource_codes.iter().enumerate() {
        let resource = resolve_resource(tx, tenant_id, organization_id, resource_code).await?;
        let uuid_suffix = digest_hex(&format!("{account_id}:{resource_code}"))
            .chars()
            .take(32)
            .collect::<String>();
        let priority = i64::try_from(index + 1).unwrap_or(i64::MAX);
        let channel_resource_id = next_claw_runtime_id("routing channel resource binding")?;
        sqlx::query(
            r#"
            INSERT INTO ai_channel_resource
                (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, account_id, supplier_code, account_code, resource_id, resource_code, resource_group_id, resource_group_code, grant_type, priority, weight)
            VALUES
                (?, ?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, ?, NULL, '', 'allow', ?, 100)
            ON CONFLICT(tenant_id, organization_id, account_id, resource_code, resource_group_code) DO UPDATE SET
                status = 1,
                deleted_at = NULL,
                deleted_by = NULL,
                updated_at = excluded.updated_at,
                supplier_code = excluded.supplier_code,
                account_code = excluded.account_code,
                resource_id = excluded.resource_id,
                grant_type = excluded.grant_type,
                priority = excluded.priority,
                weight = excluded.weight,
                version = COALESCE(ai_channel_resource.version, 0) + 1
            "#,
        )
        .bind(channel_resource_id)
        .bind(format!("app-chn-resource-{uuid_suffix}"))
        .bind(tenant_id)
        .bind(organization_id)
        .bind(requested_at)
        .bind(requested_at)
        .bind(account_id)
        .bind(supplier_code)
        .bind(&account_code)
        .bind(resource.id)
        .bind(resource.resource_code)
        .bind(priority)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to upsert routing channel resources", error))?;
    }
    Ok(())
}

fn push_unique(values: &mut Vec<String>, value: &str) {
    let value = value.trim();
    if !value.is_empty()
        && !values
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(value))
    {
        values.push(value.to_owned());
    }
}

fn capability_resource_code(value: &str) -> Option<String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "llm" | "chat" | "completion" | "completions" | "response" | "responses" => {
            Some("modality.llm".to_owned())
        }
        "image" | "images" => Some("modality.image".to_owned()),
        "audio" => Some("modality.audio".to_owned()),
        "music" => Some("modality.music".to_owned()),
        "sfx" | "sound_effect" | "sound_effects" => Some("modality.sfx".to_owned()),
        "video" | "videos" => Some("modality.video".to_owned()),
        "embedding" | "embeddings" => Some("modality.embedding".to_owned()),
        _ => None,
    }
}

#[derive(Debug, Clone)]
struct ResolvedAiResource {
    id: i64,
    resource_code: String,
}

async fn load_account_code(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<String> {
    sqlx::query_scalar(
        r#"
        SELECT COALESCE(NULLIF(account_code, ''), '')
        FROM ai_channel
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(account_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load routing channel code", error))
}

async fn resolve_resource(
    tx: &mut Transaction<'_, Sqlite>,
    tenant_id: i64,
    organization_id: i64,
    resource_code: &str,
) -> DomainResult<ResolvedAiResource> {
    let row = sqlx::query(
        r#"
        SELECT id, resource_code
        FROM ai_resource
        WHERE resource_code = ?
          AND deleted_at IS NULL
          AND status = 1
          AND (
              (tenant_id = ? AND organization_id = ?)
              OR (? > 0 AND tenant_id = ? AND organization_id = 0)
              OR (tenant_id = 0 AND organization_id = 0)
          )
        ORDER BY CASE
            WHEN tenant_id = ? AND organization_id = ? THEN 0
            WHEN ? > 0 AND tenant_id = ? AND organization_id = 0 THEN 1
            WHEN tenant_id = 0 AND organization_id = 0 THEN 2
            ELSE 3
          END,
          id ASC
        LIMIT 1
        "#,
    )
    .bind(resource_code)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(organization_id)
    .bind(tenant_id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(organization_id)
    .bind(tenant_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to resolve routing channel resource", error))?;
    let Some(row) = row else {
        return Err(DomainError::not_found(format!(
            "AI resource was not found: {resource_code}"
        )));
    };
    Ok(ResolvedAiResource {
        id: integer_cell(&row, "id"),
        resource_code: string_cell(&row, "resource_code"),
    })
}

async fn soft_delete_removed_channel_resources(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: i64,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    resource_codes: &[String],
    requested_at: &str,
) -> DomainResult<()> {
    if resource_codes.is_empty() {
        return Ok(());
    }
    let keep_json = serde_json::to_string(resource_codes).map_err(|error| {
        DomainError::new(format!(
            "failed to serialize routing channel resources: {error}"
        ))
    })?;
    sqlx::query(
        r#"
        UPDATE ai_channel_resource
        SET status = -1,
            deleted_at = ?,
            deleted_by = ?,
            updated_at = ?,
            version = COALESCE(version, 0) + 1
        WHERE tenant_id = ?
          AND organization_id = ?
          AND account_id = ?
          AND deleted_at IS NULL
          AND COALESCE(NULLIF(resource_code, ''), resource_group_code) NOT IN (SELECT value FROM json_each(?))
        "#,
    )
    .bind(requested_at)
    .bind(user_id)
    .bind(requested_at)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(account_id)
    .bind(keep_json)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to replace routing channel resources", error))?;
    Ok(())
}

async fn soft_delete_channel_relationships(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteAppRoutingChannelCommand,
) -> DomainResult<()> {
    for (table_name, context) in [
        (
            "ai_channel_credential",
            "failed to delete routing channel credentials",
        ),
        (
            "ai_channel_resource",
            "failed to delete routing channel resources",
        ),
    ] {
        let sql = format!(
            r#"
            UPDATE {table_name}
            SET status = -1,
                deleted_at = ?,
                deleted_by = ?,
                updated_at = ?,
                version = COALESCE(version, 0) + 1
            WHERE account_id = ?
              AND tenant_id = ?
              AND organization_id = ?
              AND deleted_at IS NULL
            "#,
        );
        sqlx::query(&sql)
            .bind(&command.requested_at)
            .bind(command.subject.user_id)
            .bind(&command.requested_at)
            .bind(command.account_id)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .execute(&mut **tx)
            .await
            .map_err(|error| store_error(context, error))?;
    }
    Ok(())
}

async fn soft_delete_channel(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteAppRoutingChannelCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
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
    .bind(command.subject.user_id)
    .bind(&command.requested_at)
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete routing channel", error))?;
    Ok(result.rows_affected() > 0)
}

#[derive(Debug, Clone)]
struct ChannelHealthProbeTarget {
    credential_id: i64,
    provider_base_url: String,
    provider_secret_ref: String,
    provider_model: String,
    provider_timeout_ms: Option<u64>,
}

async fn load_channel_probe_target(
    tx: &mut Transaction<'_, Sqlite>,
    command: &TestAppRoutingChannelCommand,
) -> DomainResult<Option<ChannelHealthProbeTarget>> {
    let row = sqlx::query(
        r#"
        SELECT
            cc.id AS credential_id,
            COALESCE(NULLIF(cc.base_url, ''), NULLIF(c.base_url, ''), NULLIF(p.base_url, ''), '') AS provider_base_url,
            COALESCE(NULLIF(cc.credential_ref, ''), '') AS provider_secret_ref,
            COALESCE(NULLIF(r.provider_native_model, ''), NULLIF(r.model, ''), 'gpt-4o-mini') AS provider_model,
            c.timeout_ms
        FROM ai_channel c
        JOIN ai_channel_credential cc
          ON cc.account_id = c.id
         AND cc.tenant_id = c.tenant_id
         AND cc.organization_id = c.organization_id
         AND cc.status = 1
         AND cc.deleted_at IS NULL
        LEFT JOIN ai_provider p
          ON (
              p.id = c.provider_id
              OR (
                  p.supplier_code = c.supplier_code
                  AND (c.provider_id IS NULL OR c.provider_id = 0)
              )
          )
         AND p.deleted_at IS NULL
         AND (
             (p.tenant_id = c.tenant_id AND p.organization_id = c.organization_id)
             OR (p.tenant_id = 0 AND p.organization_id = 0)
             OR (p.tenant_id IS NULL AND p.organization_id IS NULL)
         )
        LEFT JOIN ai_channel_resource cr
          ON cr.account_id = c.id
         AND cr.tenant_id = c.tenant_id
         AND cr.organization_id = c.organization_id
         AND cr.status = 1
         AND cr.deleted_at IS NULL
         AND cr.grant_type = 'allow'
        LEFT JOIN ai_resource r
          ON r.resource_code = cr.resource_code
         AND r.tenant_id = cr.tenant_id
         AND r.organization_id = cr.organization_id
         AND r.deleted_at IS NULL
         AND r.status = 1
         AND COALESCE(r.resource_type, '') IN ('model', 'model_api')
        WHERE c.id = ?
          AND c.tenant_id = ?
          AND c.organization_id = ?
          AND c.deleted_at IS NULL
        ORDER BY COALESCE(cc.priority, 100) ASC,
                 COALESCE(cc.weight, 100) DESC,
                 cc.id ASC,
                 cr.priority ASC,
                 cr.id ASC
        LIMIT 1
        "#,
    )
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load routing channel health probe target", error))?;

    let Some(row) = row else {
        return Ok(None);
    };
    let provider_base_url = string_cell(&row, "provider_base_url");
    let provider_secret_ref = string_cell(&row, "provider_secret_ref");
    let provider_model = string_cell(&row, "provider_model");
    if provider_base_url.trim().is_empty()
        || provider_secret_ref.trim().is_empty()
        || provider_model.trim().is_empty()
    {
        return Err(DomainError::new(
            "routing channel health probe requires base URL, secret_ref, and model",
        ));
    }
    Ok(Some(ChannelHealthProbeTarget {
        credential_id: integer_cell(&row, "credential_id"),
        provider_base_url,
        provider_secret_ref,
        provider_model,
        provider_timeout_ms: optional_u64_cell(&row, "timeout_ms"),
    }))
}

async fn record_channel_health_test(
    tx: &mut Transaction<'_, Sqlite>,
    command: &TestAppRoutingChannelCommand,
    target: &ChannelHealthProbeTarget,
    outcome: &ProviderHealthProbeOutcome,
) -> DomainResult<bool> {
    let health_status = if outcome.success { 1 } else { 2 };
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
        SET updated_at = ?,
            health_status = ?,
            last_latency_ms = ?,
            consecutive_error_count = CASE
                WHEN ? = 1 THEN 0
                ELSE COALESCE(consecutive_error_count, 0) + 1
            END,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(outcome.latency_ms)
    .bind(health_status)
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to test routing channel", error))?;
    if result.rows_affected() == 0 {
        return Ok(false);
    }
    update_channel_credential_health(tx, command, target, outcome, health_status).await?;
    Ok(true)
}

async fn update_channel_credential_health(
    tx: &mut Transaction<'_, Sqlite>,
    command: &TestAppRoutingChannelCommand,
    target: &ChannelHealthProbeTarget,
    outcome: &ProviderHealthProbeOutcome,
    health_status: i32,
) -> DomainResult<()> {
    let result = sqlx::query(
        r#"
        UPDATE ai_channel_credential
        SET updated_at = ?,
            health_status = ?,
            last_latency_ms = ?,
            last_verified_at = ?,
            consecutive_error_count = CASE
                WHEN ? = 1 THEN 0
                ELSE COALESCE(consecutive_error_count, 0) + 1
            END,
            version = COALESCE(version, 0) + 1
        WHERE id = ?
          AND account_id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(outcome.latency_ms)
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(target.credential_id)
    .bind(command.account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update routing channel credential health", error))?;
    if result.rows_affected() != 1 {
        return Err(DomainError::new(
            "routing channel credential changed while its health probe was running",
        ));
    }
    Ok(())
}

async fn load_channel_by_id(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AppRoutingChannelItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            CAST(c.id AS TEXT) AS id,
            COALESCE(NULLIF(c.channel_name, ''), NULLIF(c.account_code, ''), NULLIF(c.supplier_code, ''), '') AS name,
            COALESCE(NULLIF(c.supplier_code, ''), 'custom') AS vendor,
            COALESCE(NULLIF(c.supplier_code, ''), 'custom') AS provider,
            COALESCE(NULLIF(c.supplier_code, ''), 'custom') AS supplier_code,
            CASE lower(COALESCE(NULLIF(c.protocol_code, ''), NULLIF(c.supplier_code, ''), 'openai'))
                WHEN 'openai' THEN 1
                WHEN 'anthropic' THEN 2
                WHEN 'gemini' THEN 3
                WHEN 'google' THEN 3
                WHEN 'ollama' THEN 4
                ELSE 9
            END AS protocol,
            COALESCE(c.auth_type, 1) AS access_type,
            COALESCE(NULLIF(c.base_url, ''), '') AS base_url,
            COALESCE(NULLIF(c.masked_label, ''), 'configured') AS api_key,
            COALESCE((
                SELECT json_group_array(selected.capability)
                FROM (
                    SELECT DISTINCT CASE COALESCE(r.modality_code, r.resource_code)
                        WHEN 'image' THEN 'image'
                        WHEN 'audio' THEN 'audio'
                        WHEN 'music' THEN 'music'
                        WHEN 'sfx' THEN 'sfx'
                        WHEN 'video' THEN 'video'
                        WHEN 'embedding' THEN 'embedding'
                        WHEN 'modality.image' THEN 'image'
                        WHEN 'modality.audio' THEN 'audio'
                        WHEN 'modality.music' THEN 'music'
                        WHEN 'modality.sfx' THEN 'sfx'
                        WHEN 'modality.video' THEN 'video'
                        WHEN 'modality.embedding' THEN 'embedding'
                        ELSE 'llm'
                    END AS capability
                    FROM ai_channel_resource cr
                    LEFT JOIN ai_resource r
                      ON r.resource_code = cr.resource_code
                     AND r.tenant_id = cr.tenant_id
                     AND r.organization_id = cr.organization_id
                     AND r.status = 1
                     AND r.deleted_at IS NULL
                    WHERE cr.account_id = c.id
                      AND cr.tenant_id = c.tenant_id
                      AND cr.organization_id = c.organization_id
                      AND cr.status = 1
                      AND cr.deleted_at IS NULL
                      AND cr.grant_type = 'allow'
                      AND (
                          COALESCE(r.resource_type, '') IN ('modality', 'model', 'model_api')
                          OR cr.resource_code LIKE 'modality.%'
                      )
                    ORDER BY capability
                ) selected
            ), '["llm"]') AS capabilities_json,
            c.timeout_ms,
            c.retry_policy AS retry_policy_json,
            c.circuit_breaker_policy AS circuit_breaker_policy_json,
            COALESCE(c.weight, 0) AS weight,
            c.status AS status,
            c.health_status AS health_status,
            COALESCE(c.last_latency_ms, 0) AS latency_ms,
            COALESCE(c.rpm_limit, 0) AS rpm_limit,
            CAST(c.upstream_balance_amount AS TEXT) AS balance_amount,
            COALESCE(c.upstream_balance_currency, '') AS balance_currency,
            COALESCE(c.consecutive_error_count, 0) AS channel_errors,
            0 AS account_errors
        FROM ai_channel c
        WHERE c.id = ?
          AND c.tenant_id = ?
          AND c.organization_id = ?
          AND c.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(account_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load routing channel", error))?;

    let Some(row) = row else {
        return Ok(None);
    };
    row_to_channel(row).map(Some)
}

fn row_to_channel(row: sqlx::sqlite::SqliteRow) -> DomainResult<AppRoutingChannelItem> {
    let id = string_cell(&row, "id");
    let capabilities = parse_string_array(&string_cell(&row, "capabilities_json"))?;
    let errors = integer_cell(&row, "channel_errors") + integer_cell(&row, "account_errors");
    let status = required_integer_cell(&row, "status")?;
    let health_status = required_integer_cell(&row, "health_status")?;
    let retry_policy_json = string_cell(&row, "retry_policy_json");
    let circuit_breaker_policy_json = string_cell(&row, "circuit_breaker_policy_json");
    Ok(AppRoutingChannelItem {
        id: id.clone(),
        name: string_cell(&row, "name"),
        vendor: display_vendor(&string_cell(&row, "vendor")),
        provider: display_vendor(&string_cell(&row, "provider")),
        supplier_code: string_cell(&row, "supplier_code"),
        protocol: protocol_label(required_integer_cell(&row, "protocol")?)?,
        access_type: access_type_label(required_integer_cell(&row, "access_type")?)?,
        base_url: string_cell(&row, "base_url"),
        api_key: string_cell(&row, "api_key"),
        models: Vec::new(),
        is_multimodal: capabilities.iter().any(|capability| capability != "llm"),
        capabilities,
        timeout_ms: row.try_get("timeout_ms").ok().flatten(),
        retry_policy: retry_policy_json
            .trim()
            .is_empty()
            .then_some(None)
            .unwrap_or_else(|| AppRoutingRetryPolicyItem::from_json(&retry_policy_json)),
        circuit_breaker_policy: circuit_breaker_policy_json
            .trim()
            .is_empty()
            .then_some(None)
            .unwrap_or_else(|| {
                crate::ports::AppRoutingCircuitBreakerPolicyItem::from_json(
                    &circuit_breaker_policy_json,
                )
            }),
        weight: integer_cell(&row, "weight"),
        status: status_label(status, health_status, errors)?,
        latency: duration_or_na(integer_cell(&row, "latency_ms")),
        rpm: integer_cell(&row, "rpm_limit"),
        balance: balance_label(
            &string_cell(&row, "balance_amount"),
            &string_cell(&row, "balance_currency"),
        ),
        errors,
    })
}

async fn load_channel_supplier_code(
    tx: &mut Transaction<'_, Sqlite>,
    account_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<String> {
    sqlx::query_scalar(
        r#"
        SELECT COALESCE(supplier_code, '')
        FROM ai_channel
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(account_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load routing channel provider code", error))
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Sqlite>,
    snapshot_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    action: &'static str,
    target_id: i64,
    payload: &serde_json::Value,
    requested_at: &str,
) -> DomainResult<()> {
    let payload = payload.to_string();
    let snapshot_no = format!("app-channel-{target_id}-{action}-{snapshot_uuid}");
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, created_at, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by)
        VALUES
            (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'ai_channel', ?, ?, ?, ?, ?)
        "#,
    )
    .bind(next_claw_runtime_id("ops_config_snapshot")?)
    .bind(snapshot_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(user_id)
    .bind(request_id)
    .bind(requested_at)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_CHANNEL)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(requested_at)
    .bind(user_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write routing channel config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    audit_log_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    action: &'static str,
    target_id: i64,
    change_summary: serde_json::Value,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(action)
    .bind(CHANNEL_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(user_id)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write routing channel audit log", error))?;
    Ok(())
}

fn channel_snapshot_payload(account_id: i64, name: &str, supplier_code: &str) -> serde_json::Value {
    serde_json::json!({
        "channelId": account_id,
        "name": name,
        "providerCode": supplier_code
    })
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

fn parse_string_array(value: &str) -> DomainResult<Vec<String>> {
    let mut parsed: Vec<String> = serde_json::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "invalid routing channel capabilities json from database row: {error}"
        ))
    })?;
    parsed.retain(|value| !value.trim().is_empty());
    if parsed.is_empty() {
        parsed.push("llm".to_owned());
    }
    Ok(parsed)
}

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
}

fn mask_secret_ref(value: &str) -> String {
    value
        .rsplit('/')
        .next()
        .filter(|part| !part.is_empty())
        .map(|part| format!("ref:***{part}"))
        .unwrap_or_else(|| "ref:***".to_owned())
}

fn protocol_storage_code(value: &str) -> &'static str {
    match value {
        "Anthropic" => "anthropic",
        "Gemini" => "gemini",
        "Ollama" => "ollama",
        "Custom" => "custom",
        _ => "openai",
    }
}

fn protocol_label(value: i64) -> DomainResult<String> {
    match value {
        1 => Ok("OpenAI"),
        2 => Ok("Anthropic"),
        3 => Ok("Gemini"),
        4 => Ok("Ollama"),
        9 => Ok("Custom"),
        value => Err(DomainError::new(format!(
            "invalid routing channel protocol from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn access_type_code(value: &str) -> i32 {
    match value {
        "GCP Vertex OAuth" => 2,
        "AWS Bedrock" => 3,
        "Azure OpenAI" => 4,
        "Claude Code" => 5,
        _ => 1,
    }
}

fn access_type_label(value: i64) -> DomainResult<String> {
    match value {
        1 => Ok("Standard API Key"),
        2 => Ok("GCP Vertex OAuth"),
        3 => Ok("AWS Bedrock"),
        4 => Ok("Azure OpenAI"),
        5 => Ok("Claude Code"),
        value => Err(DomainError::new(format!(
            "invalid routing channel access_type from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn status_code(value: &str) -> i32 {
    match value {
        "disabled" => 0,
        "error" => 2,
        _ => 1,
    }
}

fn health_status_code(value: &str) -> i32 {
    if value == "error" {
        2
    } else {
        1
    }
}

fn status_label(status: i64, health_status: i64, errors: i64) -> DomainResult<String> {
    match health_status {
        1 | 2 => {}
        value => {
            return Err(DomainError::new(format!(
                "invalid routing channel health_status from database row: {value}"
            )));
        }
    }

    let label = match status {
        -1 | 0 => "disabled",
        1 if health_status == 2 || errors > 0 => "error",
        1 => "active",
        2 => "error",
        value => {
            return Err(DomainError::new(format!(
                "invalid routing channel status from database row: {value}"
            )));
        }
    };
    Ok(label.to_owned())
}

fn display_vendor(value: &str) -> String {
    match value {
        "openai" => "OpenAI",
        "anthropic" => "Anthropic",
        "google" => "Gemini",
        "openrouter" => "OpenRouter",
        "deepseek" => "DeepSeek",
        "zhipu" => "Zhipu",
        "mistral" => "Mistral",
        "meta" => "Meta",
        "ollama" => "Ollama",
        "azure_openai" => "Azure OpenAI",
        "custom" => "Custom",
        _ => value,
    }
    .to_owned()
}

fn string_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> i64 {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .or_else(|| string_cell(row, column).parse::<i64>().ok())
        .unwrap_or_default()
}

fn required_integer_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> DomainResult<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .or_else(|| string_cell(row, column).parse::<i64>().ok())
        .ok_or_else(|| {
            DomainError::new(format!(
                "missing routing channel {column} from database row"
            ))
        })
}

fn optional_u64_cell(row: &sqlx::sqlite::SqliteRow, column: &str) -> Option<u64> {
    let value = row
        .try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            row.try_get::<Option<i32>, _>(column)
                .ok()
                .flatten()
                .map(i64::from)
        })
        .or_else(|| string_cell(row, column).parse::<i64>().ok())?;
    u64::try_from(value).ok().filter(|value| *value > 0)
}

fn duration_or_na(value: i64) -> String {
    if value > 0 {
        duration_label(value)
    } else {
        "N/A".to_owned()
    }
}

fn duration_label(value: i64) -> String {
    format!("{value}ms")
}

fn balance_label(amount: &str, currency: &str) -> String {
    if amount.trim().is_empty() {
        return "N/A".to_owned();
    }
    if currency.trim().is_empty() {
        return amount.trim().to_owned();
    }
    format!("{} {}", currency.trim(), amount.trim())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    let message = error.to_string();
    if message.contains("UNIQUE constraint failed") || message.contains("unique constraint") {
        return DomainError::conflict(format!("{context}: routing channel already exists"));
    }
    DomainError::new(format!("{context}: {message}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_string_array_rejects_invalid_capabilities_json() {
        assert_eq!(
            vec!["llm".to_owned(), "image".to_owned()],
            parse_string_array(r#"["llm", "image"]"#).expect("valid capabilities json")
        );

        let invalid = parse_string_array("not-json")
            .expect_err("invalid routing capabilities json must fail");
        assert!(invalid
            .to_string()
            .contains("invalid routing channel capabilities json from database row"));
    }
}
