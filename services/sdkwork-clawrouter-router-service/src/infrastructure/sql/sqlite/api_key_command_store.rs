use std::sync::Arc;

use sqlx::{Row, Sqlite, SqlitePool, Transaction};

use crate::application::ApiKeySecretCodec;
use crate::domain::{
    UpstreamAccountGroup, DomainError, DomainResult, GatewayAccessPolicy, GatewayApiKey, QuotaPolicy,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    ApiKeyCommandStoreFuture, CreateGatewayApiKeyCommand, CreatedGatewayApiKey,
    DeleteGatewayApiKeyCommand, DeleteGatewayApiKeyForOrganizationCommand,
    EnsureDefaultUpstreamAccountGroupCommand, GatewayApiKeyCommandStore, UpdateGatewayApiKeyCommand,
    UpdatedGatewayApiKey,
};

const API_KEY_STATUS_REVOKED: i32 = 4;

#[derive(Clone)]
pub struct SqliteGatewayApiKeyCommandStore {
    pool: SqlitePool,
    api_key_secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
}

impl SqliteGatewayApiKeyCommandStore {
    pub fn new(
        pool: SqlitePool,
        api_key_secret_codec: Arc<dyn ApiKeySecretCodec + Send + Sync>,
    ) -> Self {
        Self {
            pool,
            api_key_secret_codec,
        }
    }
}

impl GatewayApiKeyCommandStore for SqliteGatewayApiKeyCommandStore {
    fn ensure_default_upstream_account_group<'a>(
        &'a self,
        command: EnsureDefaultUpstreamAccountGroupCommand,
    ) -> ApiKeyCommandStoreFuture<'a, UpstreamAccountGroup> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin default channel group transaction", error)
            })?;
            let group = ensure_default_upstream_account_group(&mut tx, &command).await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit default channel group transaction", error)
            })?;
            Ok(group)
        })
    }

    fn create_gateway_api_key<'a>(
        &'a self,
        command: CreateGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, CreatedGatewayApiKey> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin api key transaction", error))?;
            ensure_idempotency_key_available(&mut tx, &command).await?;
            let access_policy = insert_access_policy(&mut tx, &command).await?;
            let quota_policy = insert_quota_policy(&mut tx, &command).await?;
            if command.default_for_runtime {
                clear_runtime_default_api_keys_for_create(&mut tx, &command).await?;
            }
            let api_key = insert_api_key(
                &mut tx,
                &command,
                access_policy.as_ref().map(|policy| policy.id),
                quota_policy.as_ref().map(|policy| policy.id),
                self.api_key_secret_codec.as_ref(),
            )
            .await?;
            insert_audit_log(&mut tx, &command, api_key.id).await?;
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit api key transaction", error))?;

            Ok(CreatedGatewayApiKey {
                api_key,
                access_policy,
                quota_policy,
            })
        })
    }

    fn update_gateway_api_key<'a>(
        &'a self,
        command: UpdateGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, Option<UpdatedGatewayApiKey>> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin api key update transaction", error)
            })?;
            let updated =
                update_api_key(&mut tx, &command, self.api_key_secret_codec.as_ref()).await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit api key update transaction", error)
            })?;
            Ok(updated)
        })
    }

    fn delete_gateway_api_key<'a>(
        &'a self,
        command: DeleteGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin api key delete transaction", error)
            })?;
            let deleted = revoke_api_key(&mut tx, &command).await?;
            if deleted {
                insert_delete_audit_log(&mut tx, &command).await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit api key delete transaction", error)
            })?;
            Ok(deleted)
        })
    }

    fn delete_gateway_api_key_for_organization<'a>(
        &'a self,
        command: DeleteGatewayApiKeyForOrganizationCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin admin api key delete transaction", error)
            })?;
            let deleted = revoke_api_key_for_organization(&mut tx, &command).await?;
            if deleted {
                insert_delete_for_organization_audit_log(&mut tx, &command).await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit admin api key delete transaction", error)
            })?;
            Ok(deleted)
        })
    }
}

async fn ensure_default_upstream_account_group(
    tx: &mut Transaction<'_, Sqlite>,
    command: &EnsureDefaultUpstreamAccountGroupCommand,
) -> DomainResult<UpstreamAccountGroup> {
    if let Some(group) = find_upstream_account_group_by_code(tx, command).await? {
        return Ok(group);
    }

    let pricing_plan_id = find_pricing_plan_id(tx, command).await?;
    let group_id = next_claw_runtime_id("default channel group creation")?;
    let insert_result = sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_group
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, group_name, group_code, description, group_type, environment, pricing_plan_id, pricing_plan_code, rate_multiplier, official_price_multiplier, billing_type, capacity_limit, allowed_origin, metadata)
        VALUES
            (?, ?, ?, ?, 1, 1, ?, ?, 0, ?, ?, '', 'default', 1, ?, ?, ?, ?, 1, 0, '{}', '{}')
        "#,
    )
    .bind(group_id)
    .bind(&command.group_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(&command.name)
    .bind(&command.code)
    .bind(pricing_plan_id)
    .bind(&command.pricing_plan_code)
    .bind(command.rate_multiplier.to_fixed_string(6))
    .bind(command.official_price_multiplier.to_fixed_string(6))
    .execute(&mut **tx)
    .await;

    if let Err(error) = insert_result {
        if !is_unique_violation(&error) {
            return Err(store_error("failed to create default channel group", error));
        }
        reactivate_default_upstream_account_group(tx, command, pricing_plan_id).await?;
    }

    find_upstream_account_group_by_code(tx, command)
        .await?
        .ok_or_else(|| DomainError::new("default channel group could not be reloaded"))
}

async fn reactivate_default_upstream_account_group(
    tx: &mut Transaction<'_, Sqlite>,
    command: &EnsureDefaultUpstreamAccountGroupCommand,
    pricing_plan_id: Option<i64>,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE ai_upstream_account_group
        SET status = 1,
            deleted_at = NULL,
            group_name = COALESCE(NULLIF(group_name, ''), ?),
            pricing_plan_id = COALESCE(pricing_plan_id, ?),
            pricing_plan_code = COALESCE(NULLIF(pricing_plan_code, ''), ?),
            rate_multiplier = COALESCE(rate_multiplier, ?),
            official_price_multiplier = COALESCE(official_price_multiplier, ?),
            updated_at = ?
        WHERE tenant_id = ?
          AND organization_id = ?
          AND group_code = ?
        "#,
    )
    .bind(&command.name)
    .bind(pricing_plan_id)
    .bind(&command.pricing_plan_code)
    .bind(command.rate_multiplier.to_fixed_string(6))
    .bind(command.official_price_multiplier.to_fixed_string(6))
    .bind(&command.requested_at)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.code)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to reactivate default channel group", error))?;
    Ok(())
}

async fn find_upstream_account_group_by_code(
    tx: &mut Transaction<'_, Sqlite>,
    command: &EnsureDefaultUpstreamAccountGroupCommand,
) -> DomainResult<Option<UpstreamAccountGroup>> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            COALESCE(tenant_id, 0) AS tenant_id,
            COALESCE(organization_id, 0) AS organization_id,
            COALESCE(NULLIF(group_name, ''), COALESCE(group_code, '')) AS name,
            COALESCE(group_code, '') AS code,
            COALESCE(NULLIF(pricing_plan_code, ''), ?) AS pricing_plan_code,
            COALESCE(CAST(rate_multiplier AS TEXT), '1.000000') AS rate_multiplier,
            COALESCE(CAST(official_price_multiplier AS TEXT), '1.000000') AS official_price_multiplier
        FROM ai_upstream_account_group
        WHERE tenant_id = ?
          AND organization_id = ?
          AND group_code = ?
          AND deleted_at IS NULL
          AND status = 1
        LIMIT 1
        "#,
    )
    .bind(&command.pricing_plan_code)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.code)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load default channel group", error))?;

    let Some(row) = row else {
        return Ok(None);
    };
    Ok(Some(
        UpstreamAccountGroup::new_scoped(
            row.try_get::<i64, _>("id").map_err(row_error)?,
            row.try_get::<i64, _>("tenant_id").map_err(row_error)?,
            row.try_get::<i64, _>("organization_id")
                .map_err(row_error)?,
            &row.try_get::<String, _>("code").map_err(row_error)?,
            &row.try_get::<String, _>("pricing_plan_code")
                .map_err(row_error)?,
            crate::domain::DecimalValue::parse(
                &row.try_get::<String, _>("rate_multiplier")
                    .map_err(row_error)?,
            )?,
            crate::domain::DecimalValue::parse(
                &row.try_get::<String, _>("official_price_multiplier")
                    .map_err(row_error)?,
            )?,
        )
        .with_name(&row.try_get::<String, _>("name").map_err(row_error)?),
    ))
}

async fn find_pricing_plan_id(
    tx: &mut Transaction<'_, Sqlite>,
    command: &EnsureDefaultUpstreamAccountGroupCommand,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM ai_pricing_plan
        WHERE status = 1
          AND deleted_at IS NULL
          AND plan_code = ?
          AND (tenant_id = ? OR tenant_id = 0)
          AND (organization_id = ? OR organization_id = 0)
        ORDER BY CASE
            WHEN tenant_id = ? AND organization_id = ? THEN 0
            WHEN tenant_id = ? AND organization_id = 0 THEN 1
            ELSE 2
          END,
          priority ASC,
          id ASC
        LIMIT 1
        "#,
    )
    .bind(&command.pricing_plan_code)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.tenant_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load default channel group pricing plan", error))
}

async fn ensure_idempotency_key_available(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateGatewayApiKeyCommand,
) -> DomainResult<()> {
    let existing_id: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_gateway_api_key
        WHERE tenant_id = ?
          AND idempotency_key = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(command.tenant_id)
    .bind(&command.idempotency_key)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check api key idempotency", error))?;

    if existing_id.is_some() {
        return Err(DomainError::conflict(
            "api key creation idempotency key has already been used",
        ));
    }

    Ok(())
}

async fn insert_access_policy(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateGatewayApiKeyCommand,
) -> DomainResult<Option<GatewayAccessPolicy>> {
    if !command.requires_access_policy() {
        return Ok(None);
    }
    let allowed_capabilities_json = to_json(&command.allowed_capabilities)?;
    let ip_allowlist_json = to_json(&command.ip_allowlist)?;
    let id = next_claw_runtime_id("gateway access policy creation")?;
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_access_policy
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, name, allowed_capabilities, ip_allowlist, network_policy_mode, ip_rule_count, effective_from)
        VALUES
            (?, ?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(id)
    .bind(&command.access_policy_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.created_at)
    .bind(&command.created_at)
    .bind(format!("{} access policy", command.name))
    .bind(allowed_capabilities_json)
    .bind(ip_allowlist_json)
    .bind(if command.ip_allowlist.is_empty() { 0_i32 } else { 1_i32 })
    .bind(command.ip_allowlist.len() as i32)
    .bind(&command.created_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create api key access policy", error))?;

    Ok(Some(GatewayAccessPolicy::new(
        id,
        command.allowed_capabilities.clone(),
        command.ip_allowlist.clone(),
    )))
}

async fn insert_quota_policy(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateGatewayApiKeyCommand,
) -> DomainResult<Option<QuotaPolicy>> {
    let Some(quota_limit) = command.quota_limit else {
        return Ok(None);
    };
    let id = next_claw_runtime_id("api key quota policy creation")?;
    sqlx::query(
        r#"
        INSERT INTO ai_quota_policy
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, name, quota_period, quota_unit, quota_limit, effective_from)
        VALUES
            (?, ?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(id)
    .bind(&command.quota_policy_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.created_at)
    .bind(&command.created_at)
    .bind(format!("{} quota policy", command.name))
    .bind(0_i32)
    .bind(0_i32)
    .bind(quota_limit.to_fixed_string(6))
    .bind(&command.created_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create api key quota policy", error))?;

    Ok(Some(QuotaPolicy::new(id, Some(quota_limit))))
}

async fn insert_api_key(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateGatewayApiKeyCommand,
    policy_id: Option<i64>,
    quota_policy_id: Option<i64>,
    api_key_secret_codec: &(dyn ApiKeySecretCodec + Send + Sync),
) -> DomainResult<GatewayApiKey> {
    let metadata = api_key_metadata_json(command, api_key_secret_codec)?;
    let id = next_claw_runtime_id("gateway api key creation")?;
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_api_key
            (id, uuid, tenant_id, organization_id, user_id, account_group_id, name, key_prefix, key_display_masked, key_hash, hash_alg, secret_version, idempotency_key, policy_id, quota_policy_id, status, created_at, updated_at, expire_at, last_revealed_at, metadata)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        "#,
    )
    .bind(id)
    .bind(&command.api_key_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .bind(command.group_id)
    .bind(&command.name)
    .bind(&command.key_prefix)
    .bind(&command.key_display_masked)
    .bind(&command.key_hash)
    .bind(&command.hash_alg)
    .bind(command.secret_version)
    .bind(&command.idempotency_key)
    .bind(policy_id)
    .bind(quota_policy_id)
    .bind(&command.created_at)
    .bind(&command.created_at)
    .bind(command.expire_at.as_deref())
    .bind(&metadata)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_create_api_key_error(error))?;

    Ok(GatewayApiKey {
        id,
        tenant_id: command.tenant_id,
        organization_id: command.organization_id,
        user_id: command.user_id,
        group_id: command.group_id,
        name: command.name.clone(),
        key_prefix: command.key_prefix.clone(),
        key_display_masked: command.key_display_masked.clone(),
        key_hash: command.key_hash.clone(),
        copyable_key: Some(command.copyable_key.clone()),
        policy_id,
        quota_policy_id,
        created_at: command.created_at.clone(),
        expire_at: command.expire_at.clone(),
        status_code: 1,
        default_for_runtime: command.default_for_runtime,
        account_group_bindings: Vec::new(),
    })
}

async fn clear_runtime_default_api_keys_for_create(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateGatewayApiKeyCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET metadata = json_set(COALESCE(metadata, '{}'), '$.runtime.defaultForRuntime', json('false')),
            updated_at = ?
        WHERE tenant_id = ?
          AND organization_id = ?
          AND user_id = ?
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(&command.created_at)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to clear runtime default api keys", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    command: &CreateGatewayApiKeyCommand,
    api_key_id: i64,
) -> DomainResult<()> {
    let change_summary = serde_json::json!({
        "action": "create_api_key",
        "tenantId": command.tenant_id,
        "organizationId": command.organization_id,
        "userId": command.user_id,
        "operatorId": command.operator_id,
        "operatorType": command.operator_type,
        "apiKeyId": api_key_id,
        "groupId": command.group_id,
        "name": &command.name,
        "keyPrefix": &command.key_prefix,
        "idempotencyKey": &command.idempotency_key,
        "storesSecretPlaintext": false
    });
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            (?, ?, ?, ?, 'create_api_key', 1, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(&command.audit_log_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(api_key_id)
    .bind(&command.request_id)
    .bind(command.operator_id)
    .bind(command.operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write api key audit log", error))?;
    Ok(())
}

async fn update_api_key(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateGatewayApiKeyCommand,
    api_key_secret_codec: &(dyn ApiKeySecretCodec + Send + Sync),
) -> DomainResult<Option<UpdatedGatewayApiKey>> {
    let current = load_owned_api_key(
        tx,
        command.api_key_id,
        command.tenant_id,
        command.organization_id,
        command.user_id,
        api_key_secret_codec,
    )
    .await?;
    let Some(mut api_key) = current else {
        return Ok(None);
    };

    let access_policy = upsert_update_access_policy(tx, command, api_key.policy_id).await?;
    if command.allowed_capabilities.is_some() || command.ip_allowlist.is_some() {
        api_key.policy_id = access_policy.as_ref().map(|policy| policy.id);
    }
    let quota_policy = upsert_update_quota_policy(tx, command, api_key.quota_policy_id).await?;
    if command.quota_limit.is_some() {
        api_key.quota_policy_id = quota_policy.as_ref().map(|policy| policy.id);
    }
    if let Some(name) = &command.name {
        api_key.name = name.clone();
    }
    if let Some(group_id) = command.group_id {
        api_key.group_id = group_id;
    }
    if let Some(expire_at) = &command.expire_at {
        api_key.expire_at = expire_at.clone();
    }
    if let Some(default_for_runtime) = command.default_for_runtime {
        if default_for_runtime {
            clear_runtime_default_api_keys(tx, command).await?;
        }
        set_runtime_default_api_key(tx, command, default_for_runtime).await?;
        api_key.default_for_runtime = default_for_runtime;
    }

    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET name = ?,
            account_group_id = ?,
            policy_id = ?,
            quota_policy_id = ?,
            expire_at = ?,
            updated_at = ?
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND user_id = ?
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(&api_key.name)
    .bind(api_key.group_id)
    .bind(api_key.policy_id)
    .bind(api_key.quota_policy_id)
    .bind(api_key.expire_at.as_deref())
    .bind(&command.requested_at)
    .bind(command.api_key_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update api key", error))?;

    insert_update_audit_log(tx, command, &api_key).await?;
    Ok(Some(UpdatedGatewayApiKey {
        api_key,
        access_policy,
        quota_policy,
    }))
}

async fn load_owned_api_key(
    tx: &mut Transaction<'_, Sqlite>,
    api_key_id: i64,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    api_key_secret_codec: &(dyn ApiKeySecretCodec + Send + Sync),
) -> DomainResult<Option<GatewayApiKey>> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            COALESCE(tenant_id, 0) AS tenant_id,
            COALESCE(organization_id, 0) AS organization_id,
            COALESCE(user_id, 0) AS user_id,
            COALESCE(account_group_id, 0) AS group_id,
            COALESCE(name, '') AS name,
            COALESCE(key_prefix, '') AS key_prefix,
            COALESCE(NULLIF(key_display_masked, ''), COALESCE(key_prefix, '') || '********') AS key_display_masked,
            COALESCE(key_hash, '') AS key_hash,
            json_extract(COALESCE(metadata, '{}'), '$.copyableKeyCiphertext') AS copyable_key,
            policy_id,
            quota_policy_id,
            COALESCE(created_at, '') AS created_at,
            expire_at,
            status AS status_code,
            COALESCE(json_extract(COALESCE(metadata, '{}'), '$.runtime.defaultForRuntime'), false) AS default_for_runtime
        FROM iam_gateway_api_key
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND user_id = ?
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(api_key_id)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(user_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load api key for update", error))?;

    row.map(|row| gateway_api_key_from_row(row, api_key_secret_codec))
        .transpose()
}

async fn clear_runtime_default_api_keys(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateGatewayApiKeyCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET metadata = json_set(COALESCE(metadata, '{}'), '$.runtime.defaultForRuntime', json('false')),
            updated_at = ?
        WHERE tenant_id = ?
          AND organization_id = ?
          AND user_id = ?
          AND id <> ?
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .bind(command.api_key_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to clear runtime default api keys", error))?;
    Ok(())
}

async fn set_runtime_default_api_key(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateGatewayApiKeyCommand,
    default_for_runtime: bool,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET metadata = json_set(COALESCE(metadata, '{}'), '$.runtime.defaultForRuntime', json(?)),
            updated_at = ?
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND user_id = ?
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(if default_for_runtime { "true" } else { "false" })
    .bind(&command.requested_at)
    .bind(command.api_key_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to set runtime default api key", error))?;
    Ok(())
}

fn gateway_api_key_from_row(
    row: sqlx::sqlite::SqliteRow,
    api_key_secret_codec: &(dyn ApiKeySecretCodec + Send + Sync),
) -> DomainResult<GatewayApiKey> {
    Ok(GatewayApiKey {
        id: row.try_get::<i64, _>("id").map_err(row_error)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(row_error)?,
        organization_id: row
            .try_get::<i64, _>("organization_id")
            .map_err(row_error)?,
        user_id: row.try_get::<i64, _>("user_id").map_err(row_error)?,
        group_id: row.try_get::<i64, _>("group_id").map_err(row_error)?,
        name: row.try_get::<String, _>("name").map_err(row_error)?,
        key_prefix: row.try_get::<String, _>("key_prefix").map_err(row_error)?,
        key_display_masked: row
            .try_get::<String, _>("key_display_masked")
            .map_err(row_error)?,
        key_hash: row.try_get::<String, _>("key_hash").map_err(row_error)?,
        copyable_key: row
            .try_get::<Option<String>, _>("copyable_key")
            .map_err(row_error)?
            .map(|ciphertext| api_key_secret_codec.decode_secret(&ciphertext))
            .transpose()?,
        policy_id: row
            .try_get::<Option<i64>, _>("policy_id")
            .map_err(row_error)?,
        quota_policy_id: row
            .try_get::<Option<i64>, _>("quota_policy_id")
            .map_err(row_error)?,
        created_at: row.try_get::<String, _>("created_at").map_err(row_error)?,
        expire_at: row
            .try_get::<Option<String>, _>("expire_at")
            .map_err(row_error)?,
        status_code: row.try_get::<i32, _>("status_code").map_err(row_error)?,
        default_for_runtime: row
            .try_get::<bool, _>("default_for_runtime")
            .map_err(row_error)?,
        account_group_bindings: Vec::new(),
    })
}

async fn upsert_update_access_policy(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateGatewayApiKeyCommand,
    current_policy_id: Option<i64>,
) -> DomainResult<Option<GatewayAccessPolicy>> {
    if command.allowed_capabilities.is_none() && command.ip_allowlist.is_none() {
        return load_access_policy(tx, current_policy_id).await;
    }
    let allowed_capabilities = command.allowed_capabilities.clone().unwrap_or_default();
    let ip_allowlist = command.ip_allowlist.clone().unwrap_or_default();
    if allowed_capabilities.is_empty() && ip_allowlist.is_empty() {
        return Ok(None);
    }
    if let Some(policy_id) = current_policy_id {
        sqlx::query(
            r#"
            UPDATE iam_gateway_access_policy
            SET allowed_capabilities = ?,
                ip_allowlist = ?,
                network_policy_mode = ?,
                ip_rule_count = ?,
                status = 1,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(to_json(&allowed_capabilities)?)
        .bind(to_json(&ip_allowlist)?)
        .bind(if ip_allowlist.is_empty() {
            0_i32
        } else {
            1_i32
        })
        .bind(ip_allowlist.len() as i32)
        .bind(&command.requested_at)
        .bind(policy_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to update api key access policy", error))?;
        return Ok(Some(GatewayAccessPolicy::new(
            policy_id,
            allowed_capabilities,
            ip_allowlist,
        )));
    }
    let id = next_claw_runtime_id("gateway access policy update creation")?;
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_access_policy
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, name, allowed_capabilities, ip_allowlist, network_policy_mode, ip_rule_count, effective_from)
        VALUES
            (?, ?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(id)
    .bind(&command.access_policy_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(format!("api key {} access policy", command.api_key_id))
    .bind(to_json(&allowed_capabilities)?)
    .bind(to_json(&ip_allowlist)?)
    .bind(if ip_allowlist.is_empty() { 0_i32 } else { 1_i32 })
    .bind(ip_allowlist.len() as i32)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create api key access policy", error))?;
    Ok(Some(GatewayAccessPolicy::new(
        id,
        allowed_capabilities,
        ip_allowlist,
    )))
}

async fn load_access_policy(
    tx: &mut Transaction<'_, Sqlite>,
    policy_id: Option<i64>,
) -> DomainResult<Option<GatewayAccessPolicy>> {
    let Some(policy_id) = policy_id else {
        return Ok(None);
    };
    let row = sqlx::query(
        r#"
        SELECT
            id,
            COALESCE(allowed_capabilities, '[]') AS allowed_capabilities_json,
            COALESCE(ip_allowlist, '[]') AS ip_allowlist_json
        FROM iam_gateway_access_policy
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(policy_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load api key access policy", error))?;
    let Some(row) = row else {
        return Ok(None);
    };
    Ok(Some(GatewayAccessPolicy::new(
        row.try_get::<i64, _>("id").map_err(row_error)?,
        json_string_array(
            &row.try_get::<String, _>("allowed_capabilities_json")
                .map_err(row_error)?,
        )?,
        json_string_array(
            &row.try_get::<String, _>("ip_allowlist_json")
                .map_err(row_error)?,
        )?,
    )))
}

async fn upsert_update_quota_policy(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateGatewayApiKeyCommand,
    current_policy_id: Option<i64>,
) -> DomainResult<Option<QuotaPolicy>> {
    let Some(quota_limit) = command.quota_limit else {
        return load_quota_policy(tx, current_policy_id).await;
    };
    let Some(quota_limit) = quota_limit else {
        return Ok(None);
    };
    if let Some(policy_id) = current_policy_id {
        sqlx::query(
            r#"
            UPDATE ai_quota_policy
            SET quota_limit = ?,
                status = 1,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(quota_limit.to_fixed_string(6))
        .bind(&command.requested_at)
        .bind(policy_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| store_error("failed to update api key quota policy", error))?;
        return Ok(Some(QuotaPolicy::new(policy_id, Some(quota_limit))));
    }
    let id = next_claw_runtime_id("api key quota policy update creation")?;
    sqlx::query(
        r#"
        INSERT INTO ai_quota_policy
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, name, quota_period, quota_unit, quota_limit, effective_from)
        VALUES
            (?, ?, ?, ?, 1, 1, ?, ?, 0, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(id)
    .bind(&command.quota_policy_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(format!("api key {} quota policy", command.api_key_id))
    .bind(0_i32)
    .bind(0_i32)
    .bind(quota_limit.to_fixed_string(6))
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create api key quota policy", error))?;
    Ok(Some(QuotaPolicy::new(id, Some(quota_limit))))
}

async fn load_quota_policy(
    tx: &mut Transaction<'_, Sqlite>,
    policy_id: Option<i64>,
) -> DomainResult<Option<QuotaPolicy>> {
    let Some(policy_id) = policy_id else {
        return Ok(None);
    };
    let row = sqlx::query(
        r#"
        SELECT id, CAST(quota_limit AS TEXT) AS quota_limit
        FROM ai_quota_policy
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(policy_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load api key quota policy", error))?;
    let Some(row) = row else {
        return Ok(None);
    };
    let quota_limit = row
        .try_get::<Option<String>, _>("quota_limit")
        .map_err(row_error)?
        .map(|value| crate::domain::DecimalValue::parse(&value))
        .transpose()?;
    Ok(Some(QuotaPolicy::new(
        row.try_get::<i64, _>("id").map_err(row_error)?,
        quota_limit,
    )))
}

async fn revoke_api_key(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteGatewayApiKeyCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET status = ?,
            revoked_at = ?,
            revoked_by = ?,
            updated_at = ?
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND user_id = ?
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(API_KEY_STATUS_REVOKED)
    .bind(&command.requested_at)
    .bind(command.operator_id)
    .bind(&command.requested_at)
    .bind(command.api_key_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.user_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to revoke api key", error))?;
    Ok(result.rows_affected() > 0)
}

async fn revoke_api_key_for_organization(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteGatewayApiKeyForOrganizationCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET status = ?,
            revoked_at = ?,
            revoked_by = ?,
            updated_at = ?
        WHERE id = ?
          AND tenant_id = ?
          AND organization_id = ?
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(API_KEY_STATUS_REVOKED)
    .bind(&command.requested_at)
    .bind(command.operator_id)
    .bind(&command.requested_at)
    .bind(command.api_key_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to revoke admin api key", error))?;
    Ok(result.rows_affected() > 0)
}

async fn insert_update_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    command: &UpdateGatewayApiKeyCommand,
    api_key: &GatewayApiKey,
) -> DomainResult<()> {
    let change_summary = serde_json::json!({
        "action": "update_api_key",
        "tenantId": command.tenant_id,
        "organizationId": command.organization_id,
        "userId": command.user_id,
        "operatorId": command.operator_id,
        "operatorType": command.operator_type,
        "apiKeyId": command.api_key_id,
        "groupId": api_key.group_id,
        "name": api_key.name,
        "storesSecretPlaintext": false
    });
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            (?, ?, ?, ?, 'update_api_key', 1, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(&command.audit_log_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.api_key_id)
    .bind(&command.request_id)
    .bind(command.operator_id)
    .bind(command.operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write api key update audit log", error))?;
    Ok(())
}

async fn insert_delete_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteGatewayApiKeyCommand,
) -> DomainResult<()> {
    let change_summary = serde_json::json!({
        "action": "delete_api_key",
        "tenantId": command.tenant_id,
        "organizationId": command.organization_id,
        "userId": command.user_id,
        "operatorId": command.operator_id,
        "operatorType": command.operator_type,
        "apiKeyId": command.api_key_id,
        "storesSecretPlaintext": false
    });
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            (?, ?, ?, ?, 'delete_api_key', 1, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(&command.audit_log_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.api_key_id)
    .bind(&command.request_id)
    .bind(command.operator_id)
    .bind(command.operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write api key delete audit log", error))?;
    Ok(())
}

async fn insert_delete_for_organization_audit_log(
    tx: &mut Transaction<'_, Sqlite>,
    command: &DeleteGatewayApiKeyForOrganizationCommand,
) -> DomainResult<()> {
    let change_summary = serde_json::json!({
        "action": "delete_api_key",
        "tenantId": command.tenant_id,
        "organizationId": command.organization_id,
        "operatorId": command.operator_id,
        "operatorType": command.operator_type,
        "apiKeyId": command.api_key_id,
        "storesSecretPlaintext": false
    });
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            (?, ?, ?, ?, 'delete_api_key', 1, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(&command.audit_log_uuid)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .bind(command.api_key_id)
    .bind(&command.request_id)
    .bind(command.operator_id)
    .bind(command.operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write admin api key delete audit log", error))?;
    Ok(())
}

fn to_json(value: &[String]) -> DomainResult<String> {
    serde_json::to_string(value).map_err(|error| DomainError::new(error.to_string()))
}

fn json_string_array(value: &str) -> DomainResult<Vec<String>> {
    serde_json::from_str::<Vec<String>>(value).map_err(|error| DomainError::new(error.to_string()))
}

fn api_key_metadata_json(
    command: &CreateGatewayApiKeyCommand,
    api_key_secret_codec: &(dyn ApiKeySecretCodec + Send + Sync),
) -> DomainResult<String> {
    let copyable_key_ciphertext = api_key_secret_codec.encode_secret(&command.copyable_key)?;
    serde_json::to_string(&serde_json::json!({
        "copyableKeyCiphertext": copyable_key_ciphertext,
        "copyableKeyStorage": "encrypted-managed-console-read-model",
        "runtime": {
            "defaultForRuntime": command.default_for_runtime
        }
    }))
    .map_err(|error| DomainError::new(error.to_string()))
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_create_api_key_error(error: sqlx::Error) -> DomainError {
    if is_unique_violation(&error) {
        DomainError::conflict("api key creation idempotency key has already been used")
    } else {
        store_error("failed to create api key", error)
    }
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .and_then(|database_error| database_error.code())
        .map(|code| matches!(code.as_ref(), "1555" | "2067"))
        .unwrap_or(false)
}
