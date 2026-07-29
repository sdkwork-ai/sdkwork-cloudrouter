use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{
    DomainError, DomainResult, GatewayAccessPolicy, GatewayApiKey, QuotaPolicy,
    UpstreamAccountGroup,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    ApiKeyCommandStoreFuture, CreateGatewayApiKeyCommand, CreatedGatewayApiKey,
    DeleteGatewayApiKeyCommand, DeleteGatewayApiKeyForOrganizationCommand,
    EnsureDefaultUpstreamAccountGroupCommand, GatewayApiKeyCommandStore,
    UpdateGatewayApiKeyCommand, UpdatedGatewayApiKey,
};

const API_KEY_STATUS_REVOKED: i32 = 4;

#[derive(Clone)]
pub struct PostgresGatewayApiKeyCommandStore {
    pool: PgPool,
}

impl PostgresGatewayApiKeyCommandStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl GatewayApiKeyCommandStore for PostgresGatewayApiKeyCommandStore {
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
            let updated = update_api_key(&mut tx, &command).await?;
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
    tx: &mut Transaction<'_, Postgres>,
    command: &EnsureDefaultUpstreamAccountGroupCommand,
) -> DomainResult<UpstreamAccountGroup> {
    let pricing_plan_id = find_pricing_plan_id(tx, command).await?;
    let group_id = next_claw_runtime_id("default channel group creation")?;
    let group = sqlx::query(
        r#"
        INSERT INTO ai_upstream_account_group
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, group_name, group_code, description, group_type, environment, pricing_plan_id, pricing_plan_code, rate_multiplier, official_price_multiplier, billing_type, capacity_limit, allowed_origin, metadata)
        VALUES
            ($1, $2, $3, $4, 1, 1, $5::timestamptz, $6::timestamptz, 0, $7, $8, '', 'default', 1, $9, $10, $11::numeric, $12::numeric, 1, 0, '{}'::jsonb, '{}'::jsonb)
        ON CONFLICT (tenant_id, organization_id, group_code)
        DO UPDATE SET
            status = 1,
            deleted_at = NULL,
            group_name = COALESCE(NULLIF(ai_upstream_account_group.group_name, ''), EXCLUDED.group_name),
            pricing_plan_id = COALESCE(ai_upstream_account_group.pricing_plan_id, EXCLUDED.pricing_plan_id),
            pricing_plan_code = COALESCE(NULLIF(ai_upstream_account_group.pricing_plan_code, ''), EXCLUDED.pricing_plan_code),
            rate_multiplier = COALESCE(ai_upstream_account_group.rate_multiplier, EXCLUDED.rate_multiplier),
            official_price_multiplier = COALESCE(ai_upstream_account_group.official_price_multiplier, EXCLUDED.official_price_multiplier),
            updated_at = EXCLUDED.updated_at
        RETURNING
            id,
            COALESCE(tenant_id, 0) AS tenant_id,
            COALESCE(organization_id, 0) AS organization_id,
            COALESCE(NULLIF(group_name, ''), COALESCE(group_code, '')) AS name,
            COALESCE(group_code, '') AS code,
            COALESCE(NULLIF(pricing_plan_code, ''), $10) AS pricing_plan_code,
            COALESCE(rate_multiplier::text, '1.000000') AS rate_multiplier,
            COALESCE(official_price_multiplier::text, '1.000000') AS official_price_multiplier
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
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to ensure default channel group", error))?;

    upstream_account_group_from_row(group)
}

async fn find_pricing_plan_id(
    tx: &mut Transaction<'_, Postgres>,
    command: &EnsureDefaultUpstreamAccountGroupCommand,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM ai_pricing_plan
        WHERE status = 1
          AND deleted_at IS NULL
          AND plan_code = $1
          AND (tenant_id = $2 OR tenant_id = 0)
          AND (organization_id = $3 OR organization_id = 0)
        ORDER BY CASE
            WHEN tenant_id = $2 AND organization_id = $3 THEN 0
            WHEN tenant_id = $2 AND organization_id = 0 THEN 1
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
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load default channel group pricing plan", error))
}

fn upstream_account_group_from_row(
    row: sqlx::postgres::PgRow,
) -> DomainResult<UpstreamAccountGroup> {
    Ok(UpstreamAccountGroup::new_scoped(
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
    .with_name(&row.try_get::<String, _>("name").map_err(row_error)?))
}

async fn ensure_idempotency_key_available(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateGatewayApiKeyCommand,
) -> DomainResult<()> {
    let existing_id: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_gateway_api_key
        WHERE tenant_id = $1
          AND idempotency_key = $2
          AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
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
    tx: &mut Transaction<'_, Postgres>,
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
            ($1, $2, $3, $4, 1, 1, $5::timestamptz, $6::timestamptz, 0, $7, $8::jsonb, $9::jsonb, $10, $11, $12::timestamptz)
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
    tx: &mut Transaction<'_, Postgres>,
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
            ($1, $2, $3, $4, 1, 1, $5::timestamptz, $6::timestamptz, 0, $7, $8, $9, $10::numeric, $11::timestamptz)
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
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateGatewayApiKeyCommand,
    policy_id: Option<i64>,
    quota_policy_id: Option<i64>,
) -> DomainResult<GatewayApiKey> {
    let metadata = api_key_metadata_json(command)?;
    let id = next_claw_runtime_id("gateway api key creation")?;
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_api_key
            (id, uuid, tenant_id, organization_id, user_id, account_group_id, name, key_prefix, key_display_masked, key_hash, hash_alg, secret_version, idempotency_key, policy_id, quota_policy_id, status, created_at, updated_at, expire_at, last_revealed_at, metadata)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1, $16::timestamptz, $17::timestamptz, $18::timestamptz, CURRENT_TIMESTAMP, $19::jsonb)
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
    .map_err(store_create_api_key_error)?;

    Ok(GatewayApiKey {
        id,
        tenant_id: command.tenant_id,
        organization_id: command.organization_id,
        user_id: command.user_id,
        default_account_group_id: command.group_id,
        name: command.name.clone(),
        key_prefix: command.key_prefix.clone(),
        key_display_masked: command.key_display_masked.clone(),
        key_hash: command.key_hash.clone(),
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
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateGatewayApiKeyCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET metadata = jsonb_set(
                jsonb_set(COALESCE(metadata, '{}'::jsonb), '{runtime}', COALESCE(metadata -> 'runtime', '{}'::jsonb), true),
                '{runtime,defaultForRuntime}',
                'false'::jsonb,
                true
            ),
            updated_at = $1::timestamp AT TIME ZONE 'UTC'
        WHERE tenant_id = $2
          AND organization_id = $3
          AND user_id = $4
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
    tx: &mut Transaction<'_, Postgres>,
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
            ($1, $2, $3, $4, 'create_api_key', 1, $5, $6, $7, $8, $9::jsonb)
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
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateGatewayApiKeyCommand,
) -> DomainResult<Option<UpdatedGatewayApiKey>> {
    let current = load_owned_api_key(
        tx,
        command.api_key_id,
        command.tenant_id,
        command.organization_id,
        command.user_id,
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
        api_key.default_account_group_id = group_id;
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
        SET name = $1,
            account_group_id = $2,
            policy_id = $3,
            quota_policy_id = $4,
            expire_at = $5::timestamptz,
            updated_at = $6::timestamp AT TIME ZONE 'UTC'
        WHERE id = $7
          AND tenant_id = $8
          AND organization_id = $9
          AND user_id = $10
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(&api_key.name)
    .bind(api_key.default_account_group_id)
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
    tx: &mut Transaction<'_, Postgres>,
    api_key_id: i64,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
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
            policy_id,
            quota_policy_id,
            created_at::text AS created_at,
            expire_at::text AS expire_at,
            status AS status_code,
            COALESCE((metadata #>> '{runtime,defaultForRuntime}')::boolean, false) AS default_for_runtime
        FROM iam_gateway_api_key
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND user_id = $4
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

    row.map(gateway_api_key_from_row).transpose()
}

async fn clear_runtime_default_api_keys(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateGatewayApiKeyCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET metadata = jsonb_set(
                jsonb_set(COALESCE(metadata, '{}'::jsonb), '{runtime}', COALESCE(metadata -> 'runtime', '{}'::jsonb), true),
                '{runtime,defaultForRuntime}',
                'false'::jsonb,
                true
            ),
            updated_at = $1::timestamp AT TIME ZONE 'UTC'
        WHERE tenant_id = $2
          AND organization_id = $3
          AND user_id = $4
          AND id <> $5
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
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateGatewayApiKeyCommand,
    default_for_runtime: bool,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET metadata = jsonb_set(
                jsonb_set(COALESCE(metadata, '{}'::jsonb), '{runtime}', COALESCE(metadata -> 'runtime', '{}'::jsonb), true),
                '{runtime,defaultForRuntime}',
                $1::jsonb,
                true
            ),
            updated_at = $2::timestamp AT TIME ZONE 'UTC'
        WHERE id = $3
          AND tenant_id = $4
          AND organization_id = $5
          AND user_id = $6
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

fn gateway_api_key_from_row(row: sqlx::postgres::PgRow) -> DomainResult<GatewayApiKey> {
    Ok(GatewayApiKey {
        id: row.try_get::<i64, _>("id").map_err(row_error)?,
        tenant_id: row.try_get::<i64, _>("tenant_id").map_err(row_error)?,
        organization_id: row
            .try_get::<i64, _>("organization_id")
            .map_err(row_error)?,
        user_id: row.try_get::<i64, _>("user_id").map_err(row_error)?,
        default_account_group_id: row.try_get::<i64, _>("group_id").map_err(row_error)?,
        name: row.try_get::<String, _>("name").map_err(row_error)?,
        key_prefix: row.try_get::<String, _>("key_prefix").map_err(row_error)?,
        key_display_masked: row
            .try_get::<String, _>("key_display_masked")
            .map_err(row_error)?,
        key_hash: row.try_get::<String, _>("key_hash").map_err(row_error)?,
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
    tx: &mut Transaction<'_, Postgres>,
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
            SET allowed_capabilities = $1::jsonb,
                ip_allowlist = $2::jsonb,
                network_policy_mode = $3,
                ip_rule_count = $4,
                status = 1,
                updated_at = $5::timestamp AT TIME ZONE 'UTC'
            WHERE id = $6
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
            ($1, $2, $3, $4, 1, 1, $5::timestamptz, $6::timestamptz, 0, $7, $8::jsonb, $9::jsonb, $10, $11, $12::timestamptz)
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
    tx: &mut Transaction<'_, Postgres>,
    policy_id: Option<i64>,
) -> DomainResult<Option<GatewayAccessPolicy>> {
    let Some(policy_id) = policy_id else {
        return Ok(None);
    };
    let row = sqlx::query(
        r#"
        SELECT
            id,
            COALESCE(allowed_capabilities::text, '[]') AS allowed_capabilities_json,
            COALESCE(ip_allowlist::text, '[]') AS ip_allowlist_json
        FROM iam_gateway_access_policy
        WHERE id = $1
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
    tx: &mut Transaction<'_, Postgres>,
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
            SET quota_limit = $1::numeric,
                status = 1,
                updated_at = $2::timestamp AT TIME ZONE 'UTC'
            WHERE id = $3
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
            ($1, $2, $3, $4, 1, 1, $5::timestamptz, $6::timestamptz, 0, $7, $8, $9, $10::numeric, $11::timestamptz)
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
    tx: &mut Transaction<'_, Postgres>,
    policy_id: Option<i64>,
) -> DomainResult<Option<QuotaPolicy>> {
    let Some(policy_id) = policy_id else {
        return Ok(None);
    };
    let row = sqlx::query(
        r#"
        SELECT id, quota_limit::text AS quota_limit
        FROM ai_quota_policy
        WHERE id = $1
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
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteGatewayApiKeyCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET status = $1,
            revoked_at = $2::timestamp AT TIME ZONE 'UTC',
            revoked_by = $3,
            updated_at = $2::timestamp AT TIME ZONE 'UTC'
        WHERE id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND user_id = $7
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(API_KEY_STATUS_REVOKED)
    .bind(&command.requested_at)
    .bind(command.operator_id)
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
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteGatewayApiKeyForOrganizationCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE iam_gateway_api_key
        SET status = $1,
            revoked_at = $2::timestamp AT TIME ZONE 'UTC',
            revoked_by = $3,
            updated_at = $2::timestamp AT TIME ZONE 'UTC'
        WHERE id = $4
          AND tenant_id = $5
          AND organization_id = $6
          AND deleted_at IS NULL
          AND revoked_at IS NULL
        "#,
    )
    .bind(API_KEY_STATUS_REVOKED)
    .bind(&command.requested_at)
    .bind(command.operator_id)
    .bind(command.api_key_id)
    .bind(command.tenant_id)
    .bind(command.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to revoke admin api key", error))?;
    Ok(result.rows_affected() > 0)
}

async fn insert_update_audit_log(
    tx: &mut Transaction<'_, Postgres>,
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
        "groupId": api_key.default_account_group_id,
        "name": api_key.name,
        "storesSecretPlaintext": false
    });
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, 'update_api_key', 1, $5, $6, $7, $8, $9::jsonb)
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
    tx: &mut Transaction<'_, Postgres>,
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
            ($1, $2, $3, $4, 'delete_api_key', 1, $5, $6, $7, $8, $9::jsonb)
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
    tx: &mut Transaction<'_, Postgres>,
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
            ($1, $2, $3, $4, 'delete_api_key', 1, $5, $6, $7, $8, $9::jsonb)
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

fn api_key_metadata_json(command: &CreateGatewayApiKeyCommand) -> DomainResult<String> {
    serde_json::to_string(&serde_json::json!({
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
        .map(|code| code.as_ref() == "23505")
        .unwrap_or(false)
}
