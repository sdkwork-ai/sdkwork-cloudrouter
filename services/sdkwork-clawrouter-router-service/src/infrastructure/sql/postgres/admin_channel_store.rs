use std::collections::HashMap;
use std::sync::Arc;

use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::application::ApiKeySecretCodec;
use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_postgres_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminChannelCommandFuture, AdminChannelCredentialInput, AdminChannelCredentialItem,
    AdminChannelItem, AdminChannelListPage, AdminChannelStore, AdminChannelTestOutcome,
    CreateAdminChannelCommand, DeleteAdminChannelCommand, ListAdminChannelsQuery,
    ProviderHealthProbe, ProviderHealthProbeOutcome, ProviderHealthProbeRequest,
    TestAdminChannelCommand, UnconfiguredProviderHealthProbe, UpdateAdminChannelCommand,
};

const CHANNEL_TARGET_TYPE: i32 = 10;
const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_CHANNEL: i32 = 20;

#[derive(Clone)]
pub struct PostgresAdminChannelStore {
    pool: PgPool,
    provider_health_probe: Arc<dyn ProviderHealthProbe + Send + Sync>,
    api_key_secret_codec: Option<Arc<dyn ApiKeySecretCodec + Send + Sync>>,
}

impl std::fmt::Debug for PostgresAdminChannelStore {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("PostgresAdminChannelStore")
            .field("pool", &self.pool)
            .field("provider_health_probe", &"[configured]")
            .field("api_key_secret_codec", &self.api_key_secret_codec.is_some())
            .finish()
    }
}

impl PostgresAdminChannelStore {
    pub fn new(pool: PgPool) -> Self {
        Self::with_provider_health_probe(pool, Arc::new(UnconfiguredProviderHealthProbe))
    }

    pub fn with_provider_health_probe(
        pool: PgPool,
        provider_health_probe: Arc<dyn ProviderHealthProbe + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            provider_health_probe,
            api_key_secret_codec: None,
        }
    }

    pub fn with_api_key_secret_codec(
        pool: PgPool,
        api_key_secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    ) -> Self {
        Self::with_provider_health_probe_and_api_key_secret_codec(
            pool,
            Arc::new(UnconfiguredProviderHealthProbe),
            api_key_secret_codec,
        )
    }

    pub fn with_provider_health_probe_and_api_key_secret_codec(
        pool: PgPool,
        provider_health_probe: Arc<dyn ProviderHealthProbe + Send + Sync>,
        api_key_secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            provider_health_probe,
            api_key_secret_codec: Some(api_key_secret_codec),
        }
    }
}

impl AdminChannelStore for PostgresAdminChannelStore {
    fn list_channels<'a>(
        &'a self,
        query: ListAdminChannelsQuery,
    ) -> AdminChannelCommandFuture<'a, AdminChannelListPage> {
        Box::pin(async move {
            list_channels(&self.pool, query, self.api_key_secret_codec.as_deref()).await
        })
    }

    fn create_channel<'a>(
        &'a self,
        command: CreateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, AdminChannelItem> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin channel transaction", error))?;
            let channel_id =
                insert_channel(&mut tx, &command, self.api_key_secret_codec.as_deref()).await?;
            replace_channel_credentials(
                &mut tx,
                ReplaceChannelCredentialsScope {
                    channel_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    provider_code: command.provider_code.clone(),
                    channel_code: entity_code("chn", &command.channel_uuid),
                    requested_at: command.requested_at.clone(),
                },
                &command.credentials,
                self.api_key_secret_codec.as_deref(),
            )
            .await?;
            let resource_codes = merge_capability_resource_codes(
                &command.provider_code,
                &command.resource_codes,
                &command.capabilities,
            );
            replace_ai_resource_bindings(
                &mut tx,
                AiResourceBindingScope {
                    channel_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    provider_code: command.provider_code.clone(),
                    channel_code: entity_code("chn", &command.channel_uuid),
                    weight: command.weight,
                    request_id: command.request_id.clone(),
                    requested_at: command.requested_at.clone(),
                },
                &resource_codes,
            )
            .await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "create_channel",
                channel_id,
                &channel_snapshot_payload(channel_id, &command.name, &command.provider_code),
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
                "create_channel",
                channel_id,
                serde_json::json!({
                    "action": "create_channel",
                    "channelId": channel_id,
                    "name": &command.name,
                    "providerCode": &command.provider_code,
                    "channelType": &command.channel_type,
                    "capabilities": &command.capabilities,
                    "resourceCodes": &resource_codes,
                    "credentialCount": command.credentials.len(),
                    "credentialsStoredAsRefs": true,
                    "credentialRotation": &command.credential_rotation
                }),
            )
            .await?;
            record_postgres_ai_routing_config_change(
                &mut tx,
                channel_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "create_channel",
                    channel_id,
                    serde_json::json!({
                        "channelId": channel_id,
                        "providerCode": &command.provider_code,
                        "channelType": &command.channel_type,
                        "resourcesChanged": true,
                        "credentialsChanged": true,
                        "credentialRotationChanged": true
                    }),
                ),
            )
            .await?;
            let item = load_channel_by_id(
                &mut tx,
                channel_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                self.api_key_secret_codec.as_deref(),
            )
            .await?
            .ok_or_else(|| DomainError::new("created channel could not be reloaded"))?;
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit channel transaction", error))?;
            Ok(item)
        })
    }

    fn update_channel<'a>(
        &'a self,
        command: UpdateAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, Option<AdminChannelItem>> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin channel transaction", error))?;
            let updated = update_channel(&mut tx, &command).await?;
            if !updated {
                tx.commit()
                    .await
                    .map_err(|error| store_error("failed to commit channel transaction", error))?;
                return Ok(None);
            }
            if let Some(credentials) = command.credentials.as_ref() {
                let Some(binding_context) = load_resource_binding_context(
                    &mut tx,
                    command.channel_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                )
                .await?
                else {
                    tx.commit().await.map_err(|error| {
                        store_error("failed to commit channel transaction", error)
                    })?;
                    return Ok(None);
                };
                replace_channel_credentials(
                    &mut tx,
                    ReplaceChannelCredentialsScope {
                        channel_id: command.channel_id,
                        tenant_id: command.subject.tenant_id,
                        organization_id: command.subject.organization_id,
                        operator_id: command.subject.operator_id,
                        provider_code: command
                            .provider_code
                            .clone()
                            .unwrap_or(binding_context.provider_code),
                        channel_code: binding_context.channel_code,
                        requested_at: command.requested_at.clone(),
                    },
                    credentials,
                    self.api_key_secret_codec.as_deref(),
                )
                .await?;
            }
            if command.resource_codes.is_some() || command.capabilities.is_some() {
                let Some(binding_context) = load_resource_binding_context(
                    &mut tx,
                    command.channel_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                )
                .await?
                else {
                    tx.commit().await.map_err(|error| {
                        store_error("failed to commit channel transaction", error)
                    })?;
                    return Ok(None);
                };
                let binding_scope = AiResourceBindingScope {
                    channel_id: binding_context.channel_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    provider_code: command
                        .provider_code
                        .clone()
                        .unwrap_or(binding_context.provider_code),
                    channel_code: binding_context.channel_code,
                    weight: command.weight.unwrap_or(binding_context.weight),
                    request_id: command.request_id.clone(),
                    requested_at: command.requested_at.clone(),
                };
                if let Some(resource_codes) = command.resource_codes.as_ref() {
                    let resource_codes = if let Some(capabilities) = command.capabilities.as_ref() {
                        merge_capability_resource_codes(
                            &binding_scope.provider_code,
                            resource_codes,
                            capabilities,
                        )
                    } else {
                        resource_codes.clone()
                    };
                    replace_ai_resource_bindings(&mut tx, binding_scope, &resource_codes).await?;
                } else if let Some(capabilities) = command.capabilities.as_ref() {
                    let modality_resource_codes = modality_resource_codes(capabilities);
                    replace_channel_modality_resource_bindings(
                        &mut tx,
                        binding_scope,
                        &modality_resource_codes,
                    )
                    .await?;
                }
            }
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "update_channel",
                command.channel_id,
                &serde_json::json!({
                    "channelId": command.channel_id,
                    "nameChanged": command.name.is_some(),
                    "providerChanged": command.provider_code.is_some(),
                    "channelTypeChanged": command.channel_type.is_some(),
                    "capabilitiesChanged": command.capabilities.is_some(),
                    "resourcesChanged": command.resource_codes.is_some(),
                    "timeoutChanged": command.timeout_ms.is_some(),
                    "retryPolicyChanged": command.retry_policy_json.is_some(),
                    "circuitBreakerPolicyChanged": command.circuit_breaker_policy_json.is_some(),
                    "credentialRotationChanged": command.credential_rotation.is_some(),
                    "credentialsChanged": command.credentials.is_some(),
                    "status": command.status,
                    "weight": command.weight
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
                "update_channel",
                command.channel_id,
                serde_json::json!({
                    "action": "update_channel",
                    "channelId": command.channel_id,
                    "nameChanged": command.name.is_some(),
                    "providerChanged": command.provider_code.is_some(),
                    "channelTypeChanged": command.channel_type.is_some(),
                    "protocol": command.protocol,
                    "accessType": command.access_type,
                    "capabilitiesChanged": command.capabilities.is_some(),
                    "resourcesChanged": command.resource_codes.is_some(),
                    "timeoutChanged": command.timeout_ms.is_some(),
                    "retryPolicyChanged": command.retry_policy_json.is_some(),
                    "circuitBreakerPolicyChanged": command.circuit_breaker_policy_json.is_some(),
                    "credentialRotationChanged": command.credential_rotation.is_some(),
                    "credentialsChanged": command.credentials.is_some(),
                    "status": command.status,
                    "weight": command.weight
                }),
            )
            .await?;
            record_postgres_ai_routing_config_change(
                &mut tx,
                channel_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "update_channel",
                    command.channel_id,
                    serde_json::json!({
                        "channelId": command.channel_id,
                        "providerChanged": command.provider_code.is_some(),
                        "channelTypeChanged": command.channel_type.is_some(),
                        "capabilitiesChanged": command.capabilities.is_some(),
                        "resourcesChanged": command.resource_codes.is_some(),
                        "timeoutChanged": command.timeout_ms.is_some(),
                        "retryPolicyChanged": command.retry_policy_json.is_some(),
                        "circuitBreakerPolicyChanged": command.circuit_breaker_policy_json.is_some(),
                        "credentialRotationChanged": command.credential_rotation.is_some(),
                        "credentialsChanged": command.credentials.is_some(),
                        "statusChanged": command.status.is_some(),
                        "weightChanged": command.weight.is_some()
                    }),
                ),
            )
            .await?;
            let item = load_channel_by_id(
                &mut tx,
                command.channel_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                self.api_key_secret_codec.as_deref(),
            )
            .await?;
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit channel transaction", error))?;
            Ok(item)
        })
    }

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin channel transaction", error))?;
            let deleted = soft_delete_channel(&mut tx, &command).await?;
            if deleted {
                soft_delete_channel_relationships(&mut tx, &command).await?;
                insert_config_snapshot(
                    &mut tx,
                    &command.config_snapshot_uuid,
                    &command.request_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    "delete_channel",
                    command.channel_id,
                    &serde_json::json!({ "channelId": command.channel_id, "deleted": true }),
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
                    "delete_channel",
                    command.channel_id,
                    serde_json::json!({
                        "action": "delete_channel",
                        "channelId": command.channel_id
                    }),
                )
                .await?;
                record_postgres_ai_routing_config_change(
                    &mut tx,
                    channel_routing_config_change(
                        command.subject.tenant_id,
                        command.subject.organization_id,
                        command.subject.operator_id,
                        &command.request_id,
                        &command.requested_at,
                        "delete_channel",
                        command.channel_id,
                        serde_json::json!({
                            "channelId": command.channel_id,
                            "deleted": true
                        }),
                    ),
                )
                .await?;
            }
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit channel transaction", error))?;
            Ok(deleted)
        })
    }

    fn test_channel<'a>(
        &'a self,
        command: TestAdminChannelCommand,
    ) -> AdminChannelCommandFuture<'a, Option<AdminChannelTestOutcome>> {
        Box::pin(async move {
            let probe_target = {
                let mut tx =
                    self.pool.begin().await.map_err(|error| {
                        store_error("failed to begin channel transaction", error)
                    })?;
                let probe_target = load_channel_probe_target(
                    &mut tx,
                    &command,
                    self.api_key_secret_codec.as_deref(),
                )
                .await?;
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit channel probe target transaction", error)
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
                    provider_secret_value: probe_target.provider_secret_value.clone(),
                    provider_model: probe_target.provider_model.clone(),
                    provider_timeout_ms: probe_target.provider_timeout_ms,
                })
                .await?;
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin channel transaction", error))?;
            let updated =
                record_channel_health_test(&mut tx, &command, &probe_target, &probe_outcome)
                    .await?;
            if !updated {
                tx.commit()
                    .await
                    .map_err(|error| store_error("failed to commit channel transaction", error))?;
                return Ok(None);
            }
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "test_channel",
                command.channel_id,
                &serde_json::json!({
                    "channelId": command.channel_id,
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
                command.subject.operator_id,
                command.subject.operator_type,
                "test_channel",
                command.channel_id,
                serde_json::json!({
                    "action": "test_channel",
                    "channelId": command.channel_id,
                    "success": probe_outcome.success,
                    "healthStatus": if probe_outcome.success { "healthy" } else { "error" },
                    "httpStatus": probe_outcome.http_status
                }),
            )
            .await?;
            record_postgres_ai_routing_config_change(
                &mut tx,
                channel_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "test_channel",
                    command.channel_id,
                    serde_json::json!({
                        "channelId": command.channel_id,
                        "success": probe_outcome.success,
                        "healthStatus": if probe_outcome.success { "healthy" } else { "error" },
                        "httpStatus": probe_outcome.http_status
                    }),
                ),
            )
            .await?;
            let item = load_channel_by_id(
                &mut tx,
                command.channel_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                self.api_key_secret_codec.as_deref(),
            )
            .await?
            .ok_or_else(|| DomainError::new("tested channel could not be reloaded"))?;
            let outcome = AdminChannelTestOutcome {
                channel_id: item.id.to_string(),
                success: probe_outcome.success,
                status: item.status.clone(),
                latency: duration_label(probe_outcome.latency_ms),
                item,
            };
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit channel transaction", error))?;
            Ok(Some(outcome))
        })
    }
}

async fn list_channels(
    pool: &PgPool,
    query: ListAdminChannelsQuery,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<AdminChannelListPage> {
    let search = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_lowercase()));
    let rows = sqlx::query(
        r#"
        SELECT
            c.id,
            c.id AS channel_id,
            c.uuid,
            c.tenant_id,
            c.organization_id,
            c.created_at::text AS created_at,
            c.metadata->>'expiresAt' AS expires_at,
            COALESCE(NULLIF(c.channel_name, ''), p.display_name, c.provider_code, '') AS name,
            COALESCE(NULLIF(p.display_name, ''), c.provider_code, '') AS vendor,
            COALESCE(c.provider_code, '') AS provider_code,
            CASE LOWER(COALESCE(NULLIF(c.protocol_code, ''), NULLIF(c.provider_code, ''), 'openai'))
                WHEN 'openai' THEN 1
                WHEN 'anthropic' THEN 2
                WHEN 'gemini' THEN 3
                WHEN 'google' THEN 3
                WHEN 'ollama' THEN 4
                ELSE 9
            END AS protocol,
            COALESCE(c.auth_type, 1) AS access_type,
            COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation,
            c.timeout_ms,
            c.retry_policy::text AS retry_policy_json,
            c.circuit_breaker_policy::text AS circuit_breaker_policy_json,
            COALESCE((
                SELECT jsonb_agg(selected.code ORDER BY selected.code)::text
                FROM (
                    SELECT DISTINCT COALESCE(NULLIF(cr.resource_code, ''), cr.resource_group_code) AS code
                    FROM ai_channel_resource cr
                    LEFT JOIN ai_resource r
                      ON r.resource_code = cr.resource_code
                     AND r.tenant_id = cr.tenant_id
                     AND r.organization_id = cr.organization_id
                     AND r.deleted_at IS NULL
                    LEFT JOIN ai_resource_group rg
                      ON rg.group_code = cr.resource_group_code
                     AND rg.tenant_id = cr.tenant_id
                     AND rg.organization_id = cr.organization_id
                     AND rg.deleted_at IS NULL
                    WHERE cr.channel_id = c.id
                      AND cr.tenant_id = c.tenant_id
                      AND cr.organization_id = c.organization_id
                      AND cr.deleted_at IS NULL
                      AND cr.status = 1
                      AND cr.grant_type = 'allow'
                      AND COALESCE(r.resource_type, rg.group_type, '') NOT IN ('model', 'model_api')
                      AND COALESCE(NULLIF(cr.resource_code, ''), cr.resource_group_code, '') <> ''
                ) selected
            ), '["llm"]') AS capabilities_json,
            COALESCE(c.weight, 0) AS weight,
            c.status,
            c.health_status,
            COALESCE(c.consecutive_error_count, 0) AS channel_errors,
            COALESCE(NULLIF(c.channel_type, ''), 'official') AS channel_type,
            c.upstream_balance_amount::text AS balance_amount,
            c.upstream_balance_currency,
            h.health_status AS snapshot_health_status,
            c.deleted_at::text AS deleted_at,
            COUNT(*) OVER() AS total
        FROM ai_channel c
        LEFT JOIN ai_provider p
            ON p.provider_code = c.provider_code
           AND p.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT hs.health_status
            FROM integration_provider_health_snapshot hs
            WHERE hs.channel_id = c.id
              AND hs.tenant_id = c.tenant_id
              AND hs.organization_id = c.organization_id
              AND hs.status = 1
            ORDER BY hs.checked_at DESC NULLS LAST, hs.id DESC
            LIMIT 1
        ) h ON true
        WHERE c.tenant_id = $1
          AND c.organization_id = $2
          AND c.deleted_at IS NULL
          AND (
              $3 IS NULL
              OR LOWER(COALESCE(NULLIF(c.channel_name, ''), p.display_name, c.provider_code, '')) LIKE $3
              OR LOWER(COALESCE(NULLIF(p.display_name, ''), c.provider_code, '')) LIKE $3
          )
        ORDER BY c.priority ASC NULLS LAST, c.weight DESC NULLS LAST, c.id DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(search.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list channels", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let ai_resources =
        load_resources_for_channels(pool, query.subject.tenant_id, query.subject.organization_id)
            .await?;
    let credentials = load_credentials_for_channels(
        pool,
        query.subject.tenant_id,
        query.subject.organization_id,
        api_key_secret_codec,
    )
    .await?;
    let items = rows
        .into_iter()
        .map(|row| item_from_postgres_row(row, &ai_resources, &credentials))
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminChannelListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn insert_channel(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminChannelCommand,
    _api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<i64> {
    let metadata_json = channel_metadata_json(command.expires_at.as_deref())?;
    let channel_id = next_claw_runtime_id("admin channel creation")?;
    sqlx::query_scalar(
        r#"
        INSERT INTO ai_channel
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, provider_code, channel_code, channel_name, channel_type, protocol_code, auth_type, credential_rotation_strategy, timeout_ms, retry_policy, circuit_breaker_policy, environment, priority, weight, health_status, consecutive_error_count)
        VALUES
            ($1, $2, $3, $4, 1, $5, $6::timestamptz, $7::timestamptz, 0, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb, 1, 100, $19, $20, 0)
        RETURNING id
        "#,
    )
    .bind(channel_id)
    .bind(&command.channel_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(metadata_json)
    .bind(&command.provider_code)
    .bind(entity_code("chn", &command.channel_uuid))
    .bind(&command.name)
    .bind(&command.channel_type)
    .bind(protocol_storage_code(&command.protocol))
    .bind(access_type_code(&command.access_type))
    .bind(&command.credential_rotation)
    .bind(command.timeout_ms)
    .bind(command.retry_policy_json.as_deref())
    .bind(command.circuit_breaker_policy_json.as_deref())
    .bind(command.weight)
    .bind(health_status_code(&command.status))
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create channel", error))
}

async fn update_channel(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminChannelCommand,
) -> DomainResult<bool> {
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
    let expires_at_touched = command.expires_at.is_some();
    let expires_at = command
        .expires_at
        .as_ref()
        .and_then(|value| value.as_deref());
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
        SET channel_name = COALESCE($1, channel_name),
            provider_code = COALESCE($2, provider_code),
            channel_type = COALESCE($3, channel_type),
            protocol_code = COALESCE($4, protocol_code),
            auth_type = COALESCE($5, auth_type),
            credential_rotation_strategy = COALESCE($6, credential_rotation_strategy),
            timeout_ms = CASE WHEN $7 THEN $8 ELSE timeout_ms END,
            retry_policy = CASE WHEN $9 THEN $10::jsonb ELSE retry_policy END,
            circuit_breaker_policy = CASE WHEN $11 THEN $12::jsonb ELSE circuit_breaker_policy END,
            metadata = CASE
                WHEN $13 AND $14::text IS NULL THEN COALESCE(metadata, '{}'::jsonb) - 'expiresAt'
                WHEN $13 THEN jsonb_set(COALESCE(metadata, '{}'::jsonb), '{expiresAt}', to_jsonb($14::text), true)
                ELSE metadata
            END,
            weight = COALESCE($15, weight),
            status = COALESCE($16, status),
            health_status = COALESCE($17, health_status),
            updated_at = $18::timestamptz,
            version = COALESCE(version, 0) + 1
        WHERE id = $19
          AND tenant_id = $20
          AND organization_id = $21
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.name.as_deref())
    .bind(command.provider_code.as_deref())
    .bind(command.channel_type.as_deref())
    .bind(command.protocol.as_ref().map(|value| protocol_storage_code(value)))
    .bind(
        command
            .access_type
            .as_ref()
            .map(|value| access_type_code(value)),
    )
    .bind(command.credential_rotation.as_deref())
    .bind(timeout_touched)
    .bind(timeout_ms)
    .bind(retry_policy_touched)
    .bind(retry_policy_json)
    .bind(circuit_breaker_policy_touched)
    .bind(circuit_breaker_policy_json)
    .bind(expires_at_touched)
    .bind(expires_at)
    .bind(command.weight)
    .bind(command.status.as_ref().map(|value| status_code(value)))
    .bind(
        command
            .status
            .as_ref()
            .map(|value| health_status_code(value)),
    )
    .bind(&command.requested_at)
    .bind(command.channel_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update channel", error))?;
    Ok(result.rows_affected() > 0)
}

fn channel_credential_auth_config(
    credential_material: Option<&str>,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<serde_json::Value> {
    let mut auth_config = serde_json::json!({
        "credentialSource": if credential_material.is_some() { "channelCredentialInput" } else { "externalSecretRef" },
        "secretMaterialPresent": credential_material.is_some()
    });
    if let Some(credential_material) = credential_material {
        let Some(api_key_secret_codec) = api_key_secret_codec else {
            return Err(DomainError::new(
                "channel credential api key material requires an encrypted secret codec",
            ));
        };
        let ciphertext = api_key_secret_codec.encode_secret(credential_material)?;
        if let Some(object) = auth_config.as_object_mut() {
            object.insert(
                "secretMaterialStorage".to_owned(),
                serde_json::Value::String("encrypted-channel-auth-config".to_owned()),
            );
            object.insert(
                "secretMaterialCiphertext".to_owned(),
                serde_json::Value::String(ciphertext),
            );
        }
    }
    Ok(auth_config)
}

fn decode_channel_secret_value(
    auth_config_json: Option<&str>,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<Option<String>> {
    let Some(ciphertext) = channel_secret_ciphertext(auth_config_json)? else {
        return Ok(None);
    };
    let Some(api_key_secret_codec) = api_key_secret_codec else {
        return Err(DomainError::new(
            "managed channel credential requires an encrypted secret codec",
        ));
    };
    api_key_secret_codec.decode_secret(&ciphertext).map(Some)
}

fn channel_secret_ciphertext(auth_config_json: Option<&str>) -> DomainResult<Option<String>> {
    let Some(auth_config_json) = auth_config_json
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok(None);
    };
    let value: serde_json::Value = serde_json::from_str(auth_config_json).map_err(|error| {
        DomainError::new(format!(
            "ai_channel.auth_config must be valid JSON: {error}"
        ))
    })?;
    Ok(value
        .get("secretMaterialCiphertext")
        .or_else(|| value.get("providerSecretCiphertext"))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned))
}

#[derive(Debug, Clone)]
struct ReplaceChannelCredentialsScope {
    channel_id: i64,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    provider_code: String,
    channel_code: String,
    requested_at: String,
}

async fn replace_channel_credentials(
    tx: &mut Transaction<'_, Postgres>,
    scope: ReplaceChannelCredentialsScope,
    credentials: &[AdminChannelCredentialInput],
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<()> {
    soft_delete_channel_credentials(
        tx,
        scope.channel_id,
        scope.tenant_id,
        scope.organization_id,
        scope.operator_id,
        &scope.requested_at,
    )
    .await?;
    for credential in credentials {
        insert_channel_credential(tx, &scope, credential, api_key_secret_codec).await?;
    }
    Ok(())
}

async fn soft_delete_channel_credentials(
    tx: &mut Transaction<'_, Postgres>,
    channel_id: i64,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    requested_at: &str,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_channel_credential
        SET status = -1,
            deleted_at = $1::timestamptz,
            deleted_by = $2,
            updated_at = $3::timestamptz,
            version = COALESCE(version, 0) + 1
        WHERE channel_id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND deleted_at IS NULL
        "#,
    )
    .bind(requested_at)
    .bind(operator_id)
    .bind(requested_at)
    .bind(channel_id)
    .bind(tenant_id)
    .bind(organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete channel credentials", error))?;
    Ok(())
}

async fn insert_channel_credential(
    tx: &mut Transaction<'_, Postgres>,
    scope: &ReplaceChannelCredentialsScope,
    credential: &AdminChannelCredentialInput,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<()> {
    let auth_config = channel_credential_auth_config(
        credential.credential_material.as_deref(),
        api_key_secret_codec,
    )?
    .to_string();
    let cred_id = next_claw_runtime_id("channel credential creation")?;
    sqlx::query(
        r#"
        INSERT INTO ai_channel_credential
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, metadata, channel_id, provider_code, channel_code, credential_name, base_url, auth_config, credential_ref, credential_hash, masked_label, priority, weight, health_status, consecutive_error_count)
        VALUES
            ($1, $2, $3, $4, 1, $5, $6::timestamptz, $7::timestamptz, 0, '{}'::jsonb, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17, $18, $19, 0)
        "#,
    )
    .bind(cred_id)
    .bind(&credential.credential_uuid)
    .bind(scope.tenant_id)
    .bind(scope.organization_id)
    .bind(status_code(&credential.status))
    .bind(&scope.requested_at)
    .bind(&scope.requested_at)
    .bind(scope.channel_id)
    .bind(&scope.provider_code)
    .bind(&scope.channel_code)
    .bind(&credential.name)
    .bind(&credential.base_url)
    .bind(auth_config)
    .bind(&credential.secret_ref)
    .bind(&credential.secret_hash)
    .bind(&credential.masked_label)
    .bind(credential.priority)
    .bind(credential.weight)
    .bind(health_status_code(&credential.status))
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create channel credential", error))?;
    Ok(())
}

#[derive(Debug, Clone)]
struct AiResourceBindingScope {
    channel_id: i64,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    provider_code: String,
    channel_code: String,
    weight: i64,
    request_id: String,
    requested_at: String,
}

#[derive(Debug, Clone)]
struct ResourceBindingContext {
    channel_id: i64,
    provider_code: String,
    channel_code: String,
    weight: i64,
}

fn is_modality_capability(value: &str) -> bool {
    matches!(
        value.trim().to_ascii_lowercase().as_str(),
        "llm" | "image" | "audio" | "music" | "sfx" | "video"
    )
}

fn modality_resource_codes(capabilities: &[String]) -> Vec<String> {
    let mut resource_codes: Vec<String> = Vec::new();
    for capability in capabilities {
        let capability = capability.trim().to_ascii_lowercase();
        if is_modality_capability(&capability) {
            let resource_code = format!("modality.{capability}");
            if !resource_codes
                .iter()
                .any(|existing| existing.eq_ignore_ascii_case(&resource_code))
            {
                resource_codes.push(resource_code);
            }
        }
    }
    if resource_codes.is_empty() {
        resource_codes.push("modality.llm".to_owned());
    }
    resource_codes
}

fn merge_capability_resource_codes(
    provider_code: &str,
    resource_codes: &[String],
    capabilities: &[String],
) -> Vec<String> {
    let mut merged: Vec<String> = resource_codes.to_vec();
    let provider_vendor_resource = format!("vendor.{provider_code}");
    if !provider_code.trim().is_empty()
        && !merged
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(&provider_vendor_resource))
    {
        merged.push(provider_vendor_resource);
    }
    for resource_code in modality_resource_codes(capabilities) {
        if !merged
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(&resource_code))
        {
            merged.push(resource_code);
        }
    }
    merged
}

async fn replace_ai_resource_bindings(
    tx: &mut Transaction<'_, Postgres>,
    scope: AiResourceBindingScope,
    resource_codes: &[String],
) -> DomainResult<()> {
    soft_delete_removed_resources(tx, &scope, resource_codes).await?;
    upsert_ai_resource_bindings(tx, &scope, resource_codes, 0).await
}

async fn replace_channel_modality_resource_bindings(
    tx: &mut Transaction<'_, Postgres>,
    scope: AiResourceBindingScope,
    resource_codes: &[String],
) -> DomainResult<()> {
    soft_delete_removed_modality_resources(tx, &scope, resource_codes).await?;
    let priority_offset = load_non_modality_resource_priority_ceiling(tx, &scope).await?;
    upsert_ai_resource_bindings(tx, &scope, resource_codes, priority_offset).await
}

async fn upsert_ai_resource_bindings(
    tx: &mut Transaction<'_, Postgres>,
    scope: &AiResourceBindingScope,
    resource_codes: &[String],
    priority_offset: i64,
) -> DomainResult<()> {
    for (index, resource_code) in resource_codes.iter().enumerate() {
        let uuid_suffix = digest_hex(&format!(
            "{}:{}:{}",
            scope.request_id, scope.channel_id, resource_code
        ))
        .chars()
        .take(32)
        .collect::<String>();
        let priority = priority_offset.saturating_add(i64::try_from(index + 1).unwrap_or(i64::MAX));
        sqlx::query(
            r#"
            WITH resource_match AS (
                SELECT id
                FROM ai_resource
                WHERE tenant_id = $9
                  AND organization_id = $10
                  AND resource_code = $11
                  AND deleted_at IS NULL
                LIMIT 1
            ),
            resource_group_match AS (
                SELECT id
                FROM ai_resource_group
                WHERE tenant_id = $9
                  AND organization_id = $10
                  AND group_code = $11
                  AND deleted_at IS NULL
                LIMIT 1
            )
            INSERT INTO ai_channel_resource
                (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, channel_id, provider_code, channel_code, resource_id, resource_code, resource_group_id, resource_group_code, grant_type, priority, weight)
            VALUES
                ($1, $2, $3, 1, 1, $4::timestamptz, $5::timestamptz, 0, $6, $7, $8,
                 CASE
                    WHEN EXISTS (SELECT 1 FROM resource_group_match) THEN NULL
                    ELSE (SELECT id FROM resource_match)
                 END,
                 CASE
                    WHEN EXISTS (SELECT 1 FROM resource_group_match) THEN ''
                    WHEN EXISTS (SELECT 1 FROM resource_match) THEN $11
                    ELSE $11
                 END,
                 CASE
                    WHEN EXISTS (SELECT 1 FROM resource_group_match) THEN (SELECT id FROM resource_group_match)
                    ELSE NULL
                 END,
                 CASE
                    WHEN EXISTS (SELECT 1 FROM resource_group_match) THEN $11
                    WHEN EXISTS (SELECT 1 FROM resource_match) THEN ''
                    ELSE ''
                 END,
                 'allow', $12, $13)
            ON CONFLICT(tenant_id, organization_id, channel_id, resource_code, resource_group_code) DO UPDATE SET
                status = 1,
                deleted_at = NULL,
                deleted_by = NULL,
                updated_at = excluded.updated_at,
                provider_code = excluded.provider_code,
                channel_code = excluded.channel_code,
                resource_id = excluded.resource_id,
                resource_group_id = excluded.resource_group_id,
                grant_type = excluded.grant_type,
                priority = excluded.priority,
                weight = excluded.weight,
                version = COALESCE(ai_channel_resource.version, 0) + 1
            "#,
        )
        .bind(format!("chn-resource-{uuid_suffix}"))
        .bind(scope.tenant_id)
        .bind(scope.organization_id)
        .bind(&scope.requested_at)
        .bind(&scope.requested_at)
        .bind(scope.channel_id)
        .bind(&scope.provider_code)
        .bind(&scope.channel_code)
        .bind(scope.tenant_id)
        .bind(scope.organization_id)
        .bind(resource_code)
        .bind(priority)
        .bind(scope.weight)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to upsert channel resource", error))?;
        ensure_channel_resource_resolved(tx, scope, resource_code).await?;
    }
    Ok(())
}

async fn ensure_channel_resource_resolved(
    tx: &mut Transaction<'_, Postgres>,
    scope: &AiResourceBindingScope,
    resource_code: &str,
) -> DomainResult<()> {
    let exists: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_channel_resource
        WHERE tenant_id = $1
          AND organization_id = $2
          AND channel_id = $3
          AND COALESCE(NULLIF(resource_code, ''), resource_group_code) = $4
          AND deleted_at IS NULL
          AND (
              resource_id IS NOT NULL
              OR resource_group_id IS NOT NULL
          )
        "#,
    )
    .bind(scope.tenant_id)
    .bind(scope.organization_id)
    .bind(scope.channel_id)
    .bind(resource_code)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to verify channel resource relationship", error))?;
    if exists == 0 {
        return Err(DomainError::not_found(format!(
            "AI resource was not found: {resource_code}"
        )));
    }
    Ok(())
}

async fn soft_delete_removed_resources(
    tx: &mut Transaction<'_, Postgres>,
    scope: &AiResourceBindingScope,
    resource_codes: &[String],
) -> DomainResult<()> {
    if resource_codes.is_empty() {
        sqlx::query(
            r#"
            UPDATE ai_channel_resource
            SET status = -1, deleted_at = $1::timestamptz, deleted_by = $2,
                updated_at = $3::timestamptz, version = COALESCE(version, 0) + 1
            WHERE tenant_id = $4
              AND organization_id = $5
              AND channel_id = $6
              AND deleted_at IS NULL
            "#,
        )
        .bind(&scope.requested_at)
        .bind(scope.operator_id)
        .bind(&scope.requested_at)
        .bind(scope.tenant_id)
        .bind(scope.organization_id)
        .bind(scope.channel_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to clear channel resources", error))?;
        return Ok(());
    }

    let keep_json = string_array_json(resource_codes)?;
    sqlx::query(
        r#"
        UPDATE ai_channel_resource
        SET status = -1, deleted_at = $1::timestamptz, deleted_by = $2,
            updated_at = $3::timestamptz, version = COALESCE(version, 0) + 1
        WHERE tenant_id = $4
          AND organization_id = $5
          AND channel_id = $6
          AND deleted_at IS NULL
          AND COALESCE(NULLIF(resource_code, ''), resource_group_code) NOT IN (
              SELECT value
              FROM jsonb_array_elements_text($7::jsonb) AS keep(value)
          )
        "#,
    )
    .bind(&scope.requested_at)
    .bind(scope.operator_id)
    .bind(&scope.requested_at)
    .bind(scope.tenant_id)
    .bind(scope.organization_id)
    .bind(scope.channel_id)
    .bind(&keep_json)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to replace channel resources", error))?;
    Ok(())
}

async fn soft_delete_removed_modality_resources(
    tx: &mut Transaction<'_, Postgres>,
    scope: &AiResourceBindingScope,
    resource_codes: &[String],
) -> DomainResult<()> {
    let keep_json = string_array_json(resource_codes)?;
    sqlx::query(
        r#"
        UPDATE ai_channel_resource
        SET status = -1, deleted_at = $1::timestamptz, deleted_by = $2,
            updated_at = $3::timestamptz, version = COALESCE(version, 0) + 1
        WHERE tenant_id = $4
          AND organization_id = $5
          AND channel_id = $6
          AND deleted_at IS NULL
          AND (
              COALESCE(resource_code, '') LIKE 'modality.%'
              OR COALESCE(resource_group_code, '') LIKE 'modality.%'
              OR COALESCE(resource_id, 0) IN (
                  SELECT id
                  FROM ai_resource
                  WHERE tenant_id = $4
                    AND organization_id = $5
                    AND resource_type = 'modality'
                    AND deleted_at IS NULL
              )
              OR COALESCE(resource_group_id, 0) IN (
                  SELECT id
                  FROM ai_resource_group
                  WHERE tenant_id = $4
                    AND organization_id = $5
                    AND group_type = 'modality'
                    AND deleted_at IS NULL
              )
          )
          AND COALESCE(NULLIF(resource_code, ''), resource_group_code) NOT IN (
              SELECT value
              FROM jsonb_array_elements_text($7::jsonb) AS keep(value)
          )
        "#,
    )
    .bind(&scope.requested_at)
    .bind(scope.operator_id)
    .bind(&scope.requested_at)
    .bind(scope.tenant_id)
    .bind(scope.organization_id)
    .bind(scope.channel_id)
    .bind(&keep_json)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to replace channel modality resources", error))?;
    Ok(())
}

async fn load_non_modality_resource_priority_ceiling(
    tx: &mut Transaction<'_, Postgres>,
    scope: &AiResourceBindingScope,
) -> DomainResult<i64> {
    let row = sqlx::query(
        r#"
        SELECT COALESCE(MAX(COALESCE(priority, 100)), 0) AS priority_ceiling
        FROM ai_channel_resource
        WHERE tenant_id = $1
          AND organization_id = $2
          AND channel_id = $3
          AND deleted_at IS NULL
          AND status = 1
          AND NOT (
              COALESCE(resource_code, '') LIKE 'modality.%'
              OR COALESCE(resource_group_code, '') LIKE 'modality.%'
              OR COALESCE(resource_id, 0) IN (
                  SELECT id
                  FROM ai_resource
                  WHERE tenant_id = $1
                    AND organization_id = $2
                    AND resource_type = 'modality'
                    AND deleted_at IS NULL
              )
              OR COALESCE(resource_group_id, 0) IN (
                  SELECT id
                  FROM ai_resource_group
                  WHERE tenant_id = $1
                    AND organization_id = $2
                    AND group_type = 'modality'
                    AND deleted_at IS NULL
              )
          )
        "#,
    )
    .bind(scope.tenant_id)
    .bind(scope.organization_id)
    .bind(scope.channel_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel resource priority ceiling", error))?;
    Ok(optional_integer_cell(&row, "priority_ceiling").unwrap_or(0))
}

async fn load_resource_binding_context(
    tx: &mut Transaction<'_, Postgres>,
    channel_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<ResourceBindingContext>> {
    let row = sqlx::query(
        r#"
        SELECT
            c.id AS channel_id,
            COALESCE(c.provider_code, 'custom') AS provider_code,
            COALESCE(NULLIF(c.channel_code, ''), '') AS channel_code,
            COALESCE(c.weight, 100) AS weight
        FROM ai_channel c
        WHERE c.id = $1
          AND c.tenant_id = $2
          AND c.organization_id = $3
          AND c.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(channel_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel capability binding context", error))?;

    row.map(|row| {
        Ok(ResourceBindingContext {
            channel_id: row.try_get("channel_id").map_err(row_error)?,
            provider_code: row.try_get("provider_code").map_err(row_error)?,
            channel_code: row.try_get("channel_code").map_err(row_error)?,
            weight: row.try_get("weight").map_err(row_error)?,
        })
    })
    .transpose()
}

async fn soft_delete_channel_relationships(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminChannelCommand,
) -> DomainResult<()> {
    for (table_name, context) in [
        (
            "ai_channel_credential",
            "failed to delete channel credentials",
        ),
        ("ai_channel_resource", "failed to delete channel resources"),
    ] {
        let sql = format!(
            r#"
            UPDATE {table_name}
            SET status = -1,
                deleted_at = $1::timestamptz,
                deleted_by = $2,
                updated_at = $3::timestamptz,
                version = COALESCE(version, 0) + 1
            WHERE channel_id = $4
              AND tenant_id = $5
              AND organization_id = $6
              AND deleted_at IS NULL
            "#,
        );
        sqlx::query(&sql)
            .bind(&command.requested_at)
            .bind(command.subject.operator_id)
            .bind(&command.requested_at)
            .bind(command.channel_id)
            .bind(command.subject.tenant_id)
            .bind(command.subject.organization_id)
            .execute(&mut **tx)
            .await
            .map_err(|error| store_error(context, error))?;
    }
    Ok(())
}

async fn soft_delete_channel(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminChannelCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
        SET status = -1,
            deleted_at = $1::timestamptz,
            deleted_by = $2,
            updated_at = $3::timestamptz,
            version = COALESCE(version, 0) + 1
        WHERE id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(&command.requested_at)
    .bind(command.channel_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete channel", error))?;
    Ok(result.rows_affected() > 0)
}

#[derive(Debug, Clone)]
struct ChannelHealthProbeTarget {
    provider_id: Option<i64>,
    channel_id: i64,
    provider_account_id: i64,
    provider_base_url: String,
    provider_secret_ref: String,
    provider_secret_value: Option<String>,
    provider_model: String,
    provider_timeout_ms: Option<u64>,
}

async fn load_channel_probe_target(
    tx: &mut Transaction<'_, Postgres>,
    command: &TestAdminChannelCommand,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<Option<ChannelHealthProbeTarget>> {
    let row = sqlx::query(
        r#"
        SELECT
            c.id AS channel_id,
            p.id AS provider_id,
            cc.id AS provider_account_id,
            COALESCE(NULLIF(cc.base_url, ''), NULLIF(p.base_url, ''), '') AS provider_base_url,
            COALESCE(NULLIF(cc.credential_ref, ''), '') AS provider_secret_ref,
            cc.auth_config::text AS channel_auth_config,
            COALESCE(NULLIF(r.provider_native_model, ''), NULLIF(r.model, ''), 'gpt-4o-mini') AS provider_model,
            c.timeout_ms
        FROM ai_channel c
        JOIN ai_channel_credential cc
          ON cc.channel_id = c.id
         AND cc.tenant_id = c.tenant_id
         AND cc.organization_id = c.organization_id
         AND cc.status = 1
         AND cc.deleted_at IS NULL
        LEFT JOIN ai_provider p
          ON p.provider_code = c.provider_code
         AND p.deleted_at IS NULL
         AND (
             (p.tenant_id = c.tenant_id AND p.organization_id = c.organization_id)
             OR (p.tenant_id = 0 AND p.organization_id = 0)
             OR (p.tenant_id IS NULL AND p.organization_id IS NULL)
         )
        LEFT JOIN ai_channel_resource cr
          ON cr.channel_id = c.id
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
        WHERE c.id = $1
          AND c.tenant_id = $2
          AND c.organization_id = $3
          AND c.deleted_at IS NULL
        ORDER BY cc.priority ASC NULLS LAST, cc.weight DESC NULLS LAST, cc.id ASC, cr.priority ASC NULLS LAST, cr.id ASC
        LIMIT 1
        "#,
    )
    .bind(command.channel_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel health probe target", error))?;

    let Some(row) = row else {
        return Ok(None);
    };
    let provider_base_url = string_cell(&row, "provider_base_url");
    let provider_secret_ref = string_cell(&row, "provider_secret_ref");
    let channel_auth_config = optional_string_cell(&row, "channel_auth_config");
    let provider_model = string_cell(&row, "provider_model");
    if provider_base_url.trim().is_empty()
        || provider_secret_ref.trim().is_empty()
        || provider_model.trim().is_empty()
    {
        return Err(DomainError::new(
            "channel health probe requires base URL, secret_ref, and model",
        ));
    }
    Ok(Some(ChannelHealthProbeTarget {
        provider_id: optional_integer_cell(&row, "provider_id"),
        channel_id: integer_cell(&row, "channel_id"),
        provider_account_id: integer_cell(&row, "provider_account_id"),
        provider_base_url,
        provider_secret_ref,
        provider_secret_value: decode_channel_secret_value(
            channel_auth_config.as_deref(),
            api_key_secret_codec,
        )?,
        provider_model,
        provider_timeout_ms: optional_u64_cell(&row, "timeout_ms"),
    }))
}

async fn record_channel_health_test(
    tx: &mut Transaction<'_, Postgres>,
    command: &TestAdminChannelCommand,
    target: &ChannelHealthProbeTarget,
    outcome: &ProviderHealthProbeOutcome,
) -> DomainResult<bool> {
    let health_status = if outcome.success { 1 } else { 2 };
    let result = sqlx::query(
        r#"
        UPDATE ai_channel
        SET updated_at = $1::timestamptz,
            health_status = $2,
            last_latency_ms = $3,
            consecutive_error_count = CASE
                WHEN $4 = 1 THEN 0
                ELSE COALESCE(consecutive_error_count, 0) + 1
            END,
            version = COALESCE(version, 0) + 1
        WHERE id = $5
          AND tenant_id = $6
          AND organization_id = $7
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(outcome.latency_ms)
    .bind(health_status)
    .bind(command.channel_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to test channel", error))?;
    if result.rows_affected() == 0 {
        return Ok(false);
    }
    update_channel_credential_health(tx, command, target, outcome, health_status).await?;
    insert_provider_health_snapshot(tx, command, target, outcome, health_status).await?;
    Ok(true)
}

async fn update_channel_credential_health(
    tx: &mut Transaction<'_, Postgres>,
    command: &TestAdminChannelCommand,
    target: &ChannelHealthProbeTarget,
    outcome: &ProviderHealthProbeOutcome,
    health_status: i32,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_channel_credential
        SET updated_at = $1::timestamptz,
            health_status = $2,
            last_latency_ms = $3,
            last_verified_at = $4::timestamptz,
            consecutive_error_count = CASE
                WHEN $5 = 1 THEN 0
                ELSE COALESCE(consecutive_error_count, 0) + 1
            END,
            version = COALESCE(version, 0) + 1
        WHERE id = $6
          AND channel_id = $7
          AND tenant_id = $8
          AND organization_id = $9
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(outcome.latency_ms)
    .bind(&command.requested_at)
    .bind(health_status)
    .bind(target.provider_account_id)
    .bind(command.channel_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update channel credential health", error))?;
    Ok(())
}

async fn insert_provider_health_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    command: &TestAdminChannelCommand,
    target: &ChannelHealthProbeTarget,
    outcome: &ProviderHealthProbeOutcome,
    health_status: i32,
) -> DomainResult<()> {
    let metadata = serde_json::json!({
        "source": "admin_channel_test",
        "providerModel": target.provider_model
    })
    .to_string();
    let health_id = next_claw_runtime_id("provider health snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO integration_provider_health_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, created_at, metadata, provider_id, channel_id, provider_account_id, check_type, health_status, latency_ms, http_status, error_code, error_message_masked, checked_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, 1, $7::timestamptz, $8::jsonb, $9, $10, $11, 1, $12, $13, $14, $15, $16, $17::timestamptz)
        "#,
    )
    .bind(health_id)
    .bind(&command.config_snapshot_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.operator_id)
    .bind(&command.request_id)
    .bind(&command.requested_at)
    .bind(metadata)
    .bind(target.provider_id)
    .bind(target.channel_id)
    .bind(target.provider_account_id)
    .bind(health_status)
    .bind(outcome.latency_ms)
    .bind(outcome.http_status)
    .bind(outcome.error_code.as_deref())
    .bind(outcome.error_message_masked.as_deref())
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write channel health snapshot", error))?;
    Ok(())
}

async fn load_channel_by_id(
    tx: &mut Transaction<'_, Postgres>,
    channel_id: i64,
    tenant_id: i64,
    organization_id: i64,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<Option<AdminChannelItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            c.id,
            c.id AS channel_id,
            c.uuid,
            c.tenant_id,
            c.organization_id,
            c.created_at::text AS created_at,
            c.metadata->>'expiresAt' AS expires_at,
            COALESCE(NULLIF(c.channel_name, ''), p.display_name, c.provider_code, '') AS name,
            COALESCE(NULLIF(p.display_name, ''), c.provider_code, '') AS vendor,
            COALESCE(c.provider_code, '') AS provider_code,
            CASE LOWER(COALESCE(NULLIF(c.protocol_code, ''), NULLIF(c.provider_code, ''), 'openai'))
                WHEN 'openai' THEN 1
                WHEN 'anthropic' THEN 2
                WHEN 'gemini' THEN 3
                WHEN 'google' THEN 3
                WHEN 'ollama' THEN 4
                ELSE 9
            END AS protocol,
            COALESCE(c.auth_type, 1) AS access_type,
            COALESCE(NULLIF(c.credential_rotation_strategy, ''), 'default') AS credential_rotation,
            c.timeout_ms,
            c.retry_policy::text AS retry_policy_json,
            c.circuit_breaker_policy::text AS circuit_breaker_policy_json,
            COALESCE((
                SELECT jsonb_agg(selected.code ORDER BY selected.code)::text
                FROM (
                    SELECT DISTINCT COALESCE(NULLIF(cr.resource_code, ''), cr.resource_group_code) AS code
                    FROM ai_channel_resource cr
                    LEFT JOIN ai_resource r
                      ON r.resource_code = cr.resource_code
                     AND r.tenant_id = cr.tenant_id
                     AND r.organization_id = cr.organization_id
                     AND r.deleted_at IS NULL
                    LEFT JOIN ai_resource_group rg
                      ON rg.group_code = cr.resource_group_code
                     AND rg.tenant_id = cr.tenant_id
                     AND rg.organization_id = cr.organization_id
                     AND rg.deleted_at IS NULL
                    WHERE cr.channel_id = c.id
                      AND cr.tenant_id = c.tenant_id
                      AND cr.organization_id = c.organization_id
                      AND cr.deleted_at IS NULL
                      AND cr.status = 1
                      AND cr.grant_type = 'allow'
                      AND COALESCE(r.resource_type, rg.group_type, '') NOT IN ('model', 'model_api')
                      AND COALESCE(NULLIF(cr.resource_code, ''), cr.resource_group_code, '') <> ''
                ) selected
            ), '["llm"]') AS capabilities_json,
            COALESCE(c.weight, 0) AS weight,
            c.status,
            c.health_status,
            COALESCE(c.consecutive_error_count, 0) AS channel_errors,
            COALESCE(NULLIF(c.channel_type, ''), 'official') AS channel_type,
            c.upstream_balance_amount::text AS balance_amount,
            c.upstream_balance_currency,
            h.health_status AS snapshot_health_status,
            c.deleted_at::text AS deleted_at
        FROM ai_channel c
        LEFT JOIN ai_provider p
            ON p.provider_code = c.provider_code
           AND p.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT hs.health_status
            FROM integration_provider_health_snapshot hs
            WHERE hs.channel_id = c.id
              AND hs.tenant_id = c.tenant_id
              AND hs.organization_id = c.organization_id
              AND hs.status = 1
            ORDER BY hs.checked_at DESC NULLS LAST, hs.id DESC
            LIMIT 1
        ) h ON true
        WHERE c.id = $1
          AND c.tenant_id = $2
          AND c.organization_id = $3
          AND c.deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(channel_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel", error))?;

    let Some(row) = row else {
        return Ok(None);
    };
    let ai_resources = load_resources_for_channels_tx(tx, tenant_id, organization_id).await?;
    let credentials =
        load_credentials_for_channels_tx(tx, tenant_id, organization_id, api_key_secret_codec)
            .await?;
    item_from_postgres_row(row, &ai_resources, &credentials).map(Some)
}

async fn load_resources_for_channels(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<HashMap<i64, Vec<String>>> {
    let rows = sqlx::query(
        r#"
        SELECT channel_id, COALESCE(NULLIF(resource_code, ''), resource_group_code) AS resource_code
        FROM ai_channel_resource
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND status = 1
          AND grant_type = 'allow'
          AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
          AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
        ORDER BY COALESCE(priority, 100) ASC, id ASC
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load channel AI resources", error))?;
    resources_from_rows(rows)
}

async fn load_resources_for_channels_tx(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<HashMap<i64, Vec<String>>> {
    let rows = sqlx::query(
        r#"
        SELECT channel_id, COALESCE(NULLIF(resource_code, ''), resource_group_code) AS resource_code
        FROM ai_channel_resource
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND status = 1
          AND grant_type = 'allow'
          AND (effective_from IS NULL OR effective_from <= CURRENT_TIMESTAMP)
          AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
        ORDER BY COALESCE(priority, 100) ASC, id ASC
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel AI resources", error))?;
    resources_from_rows(rows)
}

async fn load_credentials_for_channels(
    pool: &PgPool,
    tenant_id: i64,
    organization_id: i64,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<HashMap<i64, Vec<AdminChannelCredentialItem>>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            id AS credential_id,
            uuid,
            channel_id,
            COALESCE(NULLIF(credential_name, ''), 'Credential') AS name,
            base_url,
            credential_ref AS secret_ref,
            auth_config::text AS auth_config_json,
            COALESCE(masked_label, '') AS masked_label,
            COALESCE(priority, 100) AS priority,
            COALESCE(weight, 100) AS weight,
            status,
            health_status,
            COALESCE(consecutive_error_count, 0) AS credential_errors
        FROM ai_channel_credential
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        ORDER BY channel_id ASC, priority ASC, weight DESC, id ASC
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to load channel credentials", error))?;
    credentials_from_rows(rows, api_key_secret_codec)
}

async fn load_credentials_for_channels_tx(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<HashMap<i64, Vec<AdminChannelCredentialItem>>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            id AS credential_id,
            uuid,
            channel_id,
            COALESCE(NULLIF(credential_name, ''), 'Credential') AS name,
            base_url,
            credential_ref AS secret_ref,
            auth_config::text AS auth_config_json,
            COALESCE(masked_label, '') AS masked_label,
            COALESCE(priority, 100) AS priority,
            COALESCE(weight, 100) AS weight,
            status,
            health_status,
            COALESCE(consecutive_error_count, 0) AS credential_errors
        FROM ai_channel_credential
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        ORDER BY channel_id ASC, priority ASC, weight DESC, id ASC
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_all(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load channel credentials", error))?;
    credentials_from_rows(rows, api_key_secret_codec)
}

fn credentials_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<HashMap<i64, Vec<AdminChannelCredentialItem>>> {
    let mut credentials: HashMap<i64, Vec<AdminChannelCredentialItem>> = HashMap::new();
    for row in rows {
        let channel_id: i64 = row.try_get("channel_id").map_err(row_error)?;
        credentials
            .entry(channel_id)
            .or_default()
            .push(credential_from_postgres_row(row, api_key_secret_codec)?);
    }
    Ok(credentials)
}

fn credential_from_postgres_row(
    row: sqlx::postgres::PgRow,
    api_key_secret_codec: Option<&(dyn ApiKeySecretCodec + Send + Sync)>,
) -> DomainResult<AdminChannelCredentialItem> {
    let errors = optional_integer_cell(&row, "credential_errors").unwrap_or(0);
    let status = required_integer_cell(&row, "status", "credential status")?;
    let health_status = required_integer_cell(&row, "health_status", "credential health_status")?;
    let auth_config_json = optional_string_cell(&row, "auth_config_json");
    Ok(AdminChannelCredentialItem {
        id: row.try_get("id").map_err(row_error)?,
        credential_id: row.try_get("credential_id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        name: row.try_get("name").map_err(row_error)?,
        base_url: row.try_get("base_url").map_err(row_error)?,
        secret_ref: row.try_get("secret_ref").map_err(row_error)?,
        api_key: decode_channel_secret_value(auth_config_json.as_deref(), api_key_secret_codec)?,
        masked_label: row.try_get("masked_label").map_err(row_error)?,
        priority: row.try_get("priority").map_err(row_error)?,
        weight: row.try_get("weight").map_err(row_error)?,
        status: status_label(status, health_status, None, errors)?,
        errors,
    })
}

fn resources_from_rows(
    rows: Vec<sqlx::postgres::PgRow>,
) -> DomainResult<HashMap<i64, Vec<String>>> {
    let mut resources: HashMap<i64, Vec<String>> = HashMap::new();
    for row in rows {
        let channel_id: i64 = row.try_get("channel_id").map_err(row_error)?;
        let resource_code: String = row.try_get("resource_code").map_err(row_error)?;
        if !resource_code.trim().is_empty() {
            resources.entry(channel_id).or_default().push(resource_code);
        }
    }
    Ok(resources)
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    snapshot_uuid: &str,
    request_id: &str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    action: &'static str,
    target_id: i64,
    payload: &serde_json::Value,
    requested_at: &str,
) -> DomainResult<()> {
    let payload = payload.to_string();
    let snapshot_no = format!("channel-{target_id}-{action}-{snapshot_uuid}");
    let snapshot_id = next_claw_runtime_id("channel config snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by)
        VALUES
            ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, 'ai_channel', $10::jsonb, $11::jsonb, $12, $13::timestamptz, $14)
        "#,
    )
    .bind(snapshot_id)
    .bind(snapshot_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(operator_id)
    .bind(request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_CHANNEL)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(requested_at)
    .bind(operator_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write channel config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
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
    let audit_id = next_claw_runtime_id("channel audit log")?;
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        "#,
    )
    .bind(audit_id)
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(action)
    .bind(CHANNEL_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write channel audit log", error))?;
    Ok(())
}

fn item_from_postgres_row(
    row: sqlx::postgres::PgRow,
    ai_resources: &HashMap<i64, Vec<String>>,
    credentials: &HashMap<i64, Vec<AdminChannelCredentialItem>>,
) -> DomainResult<AdminChannelItem> {
    let id: i64 = row.try_get("id").map_err(row_error)?;
    let item_credentials = credentials.get(&id).cloned().unwrap_or_default();
    let capabilities = channel_capabilities_from_resources(
        row.try_get::<String, _>("capabilities_json")
            .map_err(row_error)?
            .as_str(),
        ai_resources.get(&id).map(Vec::as_slice).unwrap_or(&[]),
    )?;
    let errors = optional_integer_cell(&row, "channel_errors").unwrap_or(0)
        + item_credentials
            .iter()
            .map(|credential| credential.errors)
            .sum::<i64>();
    let status = required_integer_cell(&row, "status", "status")?;
    let health_status = required_integer_cell(&row, "health_status", "health_status")?;
    let snapshot_health_status = optional_valid_health_status_cell(&row, "snapshot_health_status")?;
    let balance = balance_label(
        row.try_get::<Option<String>, _>("balance_amount")
            .ok()
            .flatten(),
        row.try_get::<Option<String>, _>("upstream_balance_currency")
            .ok()
            .flatten(),
    );
    Ok(AdminChannelItem {
        id,
        channel_id: row.try_get("channel_id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        created_at: row.try_get("created_at").map_err(row_error)?,
        expires_at: optional_trimmed_string_cell(&row, "expires_at"),
        name: row.try_get("name").map_err(row_error)?,
        vendor: display_vendor(
            row.try_get::<String, _>("vendor")
                .map_err(row_error)?
                .as_str(),
        ),
        provider_code: row.try_get("provider_code").map_err(row_error)?,
        channel_type: row.try_get("channel_type").map_err(row_error)?,
        protocol: protocol_label(required_integer_cell(&row, "protocol", "protocol")?)?,
        access_type: access_type_label(required_integer_cell(&row, "access_type", "access_type")?)?,
        credential_rotation: row
            .try_get::<String, _>("credential_rotation")
            .unwrap_or_else(|_| "default".to_owned()),
        credentials: item_credentials,
        resource_codes: ai_resources.get(&id).cloned().unwrap_or_default(),
        is_multimodal: capabilities.iter().any(|capability| capability != "llm"),
        capabilities,
        timeout_ms: row.try_get("timeout_ms").ok().flatten(),
        retry_policy_json: row.try_get("retry_policy_json").ok().flatten(),
        circuit_breaker_policy_json: row.try_get("circuit_breaker_policy_json").ok().flatten(),
        weight: row.try_get("weight").map_err(row_error)?,
        status: status_label(status, health_status, snapshot_health_status, errors)?,
        balance,
        errors,
        deleted_at: row.try_get("deleted_at").ok().flatten(),
    })
}

fn channel_snapshot_payload(channel_id: i64, name: &str, provider_code: &str) -> serde_json::Value {
    serde_json::json!({
        "channelId": channel_id,
        "name": name,
        "providerCode": provider_code
    })
}

fn channel_routing_config_change<'a>(
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    request_id: &'a str,
    requested_at: &'a str,
    action: &'a str,
    channel_id: i64,
    event_payload: serde_json::Value,
) -> AiRoutingConfigChange<'a> {
    AiRoutingConfigChange {
        tenant_id,
        organization_id,
        operator_id,
        request_id,
        requested_at,
        changed_object_type: "ai_channel",
        changed_object_id: channel_id,
        action,
        event_payload,
    }
}

fn entity_code(prefix: &str, uuid: &str) -> String {
    let short = uuid.chars().take(24).collect::<String>();
    format!("{prefix}-{short}")
}

fn string_array_json(values: &[String]) -> DomainResult<String> {
    serde_json::to_string(values).map_err(|error| DomainError::new(error.to_string()))
}

fn channel_metadata_json(expires_at: Option<&str>) -> DomainResult<String> {
    let mut metadata = serde_json::Map::new();
    if let Some(expires_at) = expires_at.map(str::trim).filter(|value| !value.is_empty()) {
        metadata.insert(
            "expiresAt".to_owned(),
            serde_json::Value::String(expires_at.to_owned()),
        );
    }
    serde_json::to_string(&serde_json::Value::Object(metadata))
        .map_err(|error| DomainError::new(error.to_string()))
}

fn parse_string_array(value: &str) -> DomainResult<Vec<String>> {
    let mut parsed: Vec<String> = serde_json::from_str(value).map_err(|error| {
        DomainError::new(format!(
            "invalid channel capabilities json from database row: {error}"
        ))
    })?;
    parsed.retain(|value| !value.trim().is_empty());
    if parsed.is_empty() {
        parsed.push("llm".to_owned());
    }
    Ok(parsed)
}

fn channel_capabilities_from_resources(
    capabilities_json: &str,
    resource_codes: &[String],
) -> DomainResult<Vec<String>> {
    let parsed = parse_string_array(capabilities_json)?;
    let mut capabilities = Vec::new();
    for value in parsed.iter().chain(resource_codes.iter()) {
        if let Some(capability) = channel_capability_from_resource_code(value) {
            if !capabilities.iter().any(|existing| existing == capability) {
                capabilities.push(capability.to_owned());
            }
        }
    }
    if capabilities.is_empty() {
        capabilities.push("llm".to_owned());
    }
    capabilities.sort_by_key(|capability| {
        channel_capability_index(capability).unwrap_or(CHANNEL_CAPABILITY_ORDER.len())
    });
    Ok(capabilities)
}

const CHANNEL_CAPABILITY_ORDER: [&str; 6] = ["llm", "image", "audio", "music", "sfx", "video"];

fn channel_capability_index(value: &str) -> Option<usize> {
    CHANNEL_CAPABILITY_ORDER
        .iter()
        .position(|capability| capability.eq_ignore_ascii_case(value.trim()))
}

fn channel_capability_from_resource_code(value: &str) -> Option<&str> {
    let value = value.trim();
    let capability = value
        .strip_prefix("modality.")
        .or_else(|| value.strip_prefix("capability."))
        .unwrap_or(value);
    CHANNEL_CAPABILITY_ORDER
        .iter()
        .copied()
        .find(|candidate| candidate.eq_ignore_ascii_case(capability))
}

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
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
            "invalid admin channel protocol from database row: {value}"
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
            "invalid admin channel access_type from database row: {value}"
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

fn status_label(
    status: i64,
    health_status: i64,
    snapshot_health_status: Option<i64>,
    errors: i64,
) -> DomainResult<String> {
    match status {
        -1 | 0 | 1 | 2 => {}
        value => {
            return Err(DomainError::new(format!(
                "invalid admin channel status from database row: {value}"
            )));
        }
    }
    validate_health_status(health_status)?;

    let label = if status == 0 || status == -1 {
        "disabled"
    } else if status == 2 || health_status == 2 || snapshot_health_status == Some(2) || errors > 0 {
        "error"
    } else {
        "active"
    };
    Ok(label.to_owned())
}

fn validate_health_status(value: i64) -> DomainResult<()> {
    match value {
        1 | 2 => Ok(()),
        value => Err(DomainError::new(format!(
            "invalid admin channel health_status from database row: {value}"
        ))),
    }
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

fn balance_label(amount: Option<String>, currency: Option<String>) -> String {
    match (amount, currency) {
        (Some(amount), Some(currency)) if !amount.trim().is_empty() => {
            format!("{} {}", currency.trim(), amount.trim())
        }
        (Some(amount), None) if !amount.trim().is_empty() => amount,
        _ => "N/A".to_owned(),
    }
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
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
    row: &sqlx::postgres::PgRow,
    column: &str,
    field: &str,
) -> DomainResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| missing_integer_cell_error(field))
}

fn optional_valid_health_status_cell(
    row: &sqlx::postgres::PgRow,
    column: &str,
) -> DomainResult<Option<i64>> {
    let Some(value) = optional_integer_cell(row, column) else {
        return Ok(None);
    };
    validate_health_status(value)?;
    Ok(Some(value))
}

fn missing_integer_cell_error(field: &str) -> DomainError {
    match field {
        "status" => DomainError::new("missing admin channel status from database row"),
        "health_status" => {
            DomainError::new("missing admin channel health_status from database row")
        }
        "protocol" => DomainError::new("missing admin channel protocol from database row"),
        "access_type" => DomainError::new("missing admin channel access_type from database row"),
        _ => DomainError::new(format!("missing admin channel {field} from database row")),
    }
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column)
        .or_else(|| {
            row.try_get::<String, _>(column)
                .ok()
                .and_then(|value| value.parse::<i64>().ok())
        })
        .unwrap_or(0)
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
        .unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .or_else(|| row.try_get::<String, _>(column).ok())
}

fn optional_trimmed_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    optional_string_cell(row, column).and_then(|value| {
        let value = value.trim().to_owned();
        if value.is_empty() {
            None
        } else {
            Some(value)
        }
    })
}

fn optional_u64_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<u64> {
    let value = optional_integer_cell(row, column)
        .or_else(|| string_cell(row, column).parse::<i64>().ok())?;
    u64::try_from(value).ok().filter(|value| *value > 0)
}

fn duration_label(value: i64) -> String {
    format!("{}ms", value.max(0))
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
