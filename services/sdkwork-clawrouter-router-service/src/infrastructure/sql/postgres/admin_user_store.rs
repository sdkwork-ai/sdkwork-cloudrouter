use sdkwork_contract_service::{CommerceAccountAssetType, CommerceLedgerDirection};
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DecimalValue, DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_product_center::{
    media_resource_object_blob_id, media_resource_stable_id, provider_asset_media_resource,
};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdjustAdminUserBalanceCommand, AdminUserApiKeyItem, AdminUserApiKeyListPage,
    AdminUserCommandFuture, AdminUserItem, AdminUserListPage, AdminUserStore,
    CreateAdminUserApiKeyCommand, CreateAdminUserCommand, DeleteAdminUserApiKeyCommand,
    ListAdminUserApiKeysQuery, ListAdminUsersQuery, UpdateAdminUserCommand,
};

const API_KEY_STATUS_ACTIVE: i32 = 1;
const API_KEY_STATUS_REVOKED: i32 = 4;
const TARGET_TYPE_USER: i32 = 61;
const TARGET_TYPE_API_KEY: i32 = 62;
const TARGET_TYPE_ACCOUNT: i32 = 63;
const DEFAULT_ACCOUNT_GROUP_CODE: &str = "default";
const DEFAULT_ACCOUNT_GROUP_NAME: &str = "Default";
const DEFAULT_PRICING_PLAN_CODE: &str = "standard";
const CASH_CURRENCY_CODE: &str = "USD";

struct AdminUserAuditLog<'a> {
    uuid: &'a str,
    request_id: &'a str,
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    operator_type: i32,
    action: &'a str,
    target_type: i32,
    target_id: i64,
    change_summary: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct PostgresAdminUserStore {
    pool: PgPool,
}

impl PostgresAdminUserStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminUserStore for PostgresAdminUserStore {
    fn list_users<'a>(
        &'a self,
        query: ListAdminUsersQuery,
    ) -> AdminUserCommandFuture<'a, AdminUserListPage> {
        Box::pin(async move { list_users(&self.pool, query).await })
    }

    fn list_api_keys<'a>(
        &'a self,
        query: ListAdminUserApiKeysQuery,
    ) -> AdminUserCommandFuture<'a, AdminUserApiKeyListPage> {
        Box::pin(async move { list_api_keys(&self.pool, query).await })
    }

    fn create_user<'a>(
        &'a self,
        command: CreateAdminUserCommand,
    ) -> AdminUserCommandFuture<'a, AdminUserItem> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin admin user transaction", error)
                })?;
            ensure_user_identity_available(
                &mut tx,
                command.subject.tenant_id,
                &command.email,
                &command.username,
            )
            .await?;
            let user_id = insert_user(&mut tx, &command).await?;
            insert_cash_account(&mut tx, &command, user_id).await?;
            insert_audit_log(
                &mut tx,
                AdminUserAuditLog {
                    uuid: &command.audit_log_uuid,
                    request_id: &command.request_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    operator_type: command.subject.operator_type,
                    action: "create_user",
                    target_type: TARGET_TYPE_USER,
                    target_id: user_id,
                    change_summary: serde_json::json!({
                    "action": "create_user",
                    "userId": user_id,
                    "email": &command.email,
                    "username": &command.username,
                    "initialBalance": command.initial_balance.to_fixed_string(4)
                    }),
                },
            )
            .await?;
            let item = load_user_by_id(
                &mut tx,
                user_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created user could not be reloaded"))?;
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit admin user transaction", error))?;
            Ok(item)
        })
    }

    fn update_user<'a>(
        &'a self,
        command: UpdateAdminUserCommand,
    ) -> AdminUserCommandFuture<'a, Option<AdminUserItem>> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin admin user transaction", error)
                })?;
            let updated = update_user_row(&mut tx, &command).await?;
            if !updated {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit admin user transaction", error)
                })?;
                return Ok(None);
            }
            if let Some(group) = command.group.as_deref() {
                upsert_user_membership_role(&mut tx, &command, group).await?;
            }
            insert_audit_log(
                &mut tx,
                AdminUserAuditLog {
                    uuid: &command.audit_log_uuid,
                    request_id: &command.request_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    operator_type: command.subject.operator_type,
                    action: "update_user",
                    target_type: TARGET_TYPE_USER,
                    target_id: command.user_id,
                    change_summary: serde_json::json!({
                    "action": "update_user",
                    "userId": command.user_id,
                    "usernameChanged": command.username.is_some(),
                    "group": &command.group,
                    "status": &command.status
                    }),
                },
            )
            .await?;
            let item = load_user_by_id(
                &mut tx,
                command.user_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?;
            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit admin user transaction", error))?;
            Ok(item)
        })
    }

    fn adjust_balance<'a>(
        &'a self,
        command: AdjustAdminUserBalanceCommand,
    ) -> AdminUserCommandFuture<'a, Option<AdminUserItem>> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin balance adjustment transaction", error)
            })?;
            if !user_exists(
                &mut tx,
                command.user_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit balance adjustment transaction", error)
                })?;
                return Ok(None);
            }
            let account = ensure_cash_account(&mut tx, &command).await?;
            let balance_before = DecimalValue::parse(&account.available_amount)?;
            let balance_after = if command.adjustment_type == "refund" {
                let next = balance_before.checked_subtract(command.amount)?;
                if next < DecimalValue::ZERO {
                    return Err(DomainError::conflict("refund amount exceeds user balance"));
                }
                next
            } else {
                balance_before.checked_add(command.amount)?
            };
            update_account_balance(&mut tx, &account, balance_after, &command.requested_at).await?;
            insert_account_history(
                &mut tx,
                &command,
                &account.id,
                balance_before,
                balance_after,
            )
            .await?;
            insert_audit_log(
                &mut tx,
                AdminUserAuditLog {
                    uuid: &command.audit_log_uuid,
                    request_id: &command.request_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    operator_type: command.subject.operator_type,
                    action: "adjust_user_balance",
                    target_type: TARGET_TYPE_ACCOUNT,
                    target_id: command.user_id,
                    change_summary: serde_json::json!({
                    "action": "adjust_user_balance",
                    "userId": command.user_id,
                    "accountId": &account.id,
                    "type": &command.adjustment_type,
                    "amount": command.amount.to_fixed_string(4),
                    "balanceBefore": balance_before.to_fixed_string(4),
                    "balanceAfter": balance_after.to_fixed_string(4)
                    }),
                },
            )
            .await?;
            let item = load_user_by_id(
                &mut tx,
                command.user_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit balance adjustment transaction", error)
            })?;
            Ok(item)
        })
    }

    fn create_api_key<'a>(
        &'a self,
        command: CreateAdminUserApiKeyCommand,
    ) -> AdminUserCommandFuture<'a, AdminUserApiKeyItem> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin admin api key transaction", error)
                })?;
            if !user_exists(
                &mut tx,
                command.user_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            {
                return Err(DomainError::not_found("user was not found"));
            }
            ensure_api_key_idempotency_available(&mut tx, &command).await?;
            let group_id = ensure_default_upstream_account_group(
                &mut tx,
                command.subject.tenant_id,
                command.subject.organization_id,
                &command.api_key_uuid,
                &command.requested_at,
            )
            .await?;
            let api_key_id = insert_api_key(&mut tx, &command, group_id).await?;
            insert_audit_log(
                &mut tx,
                AdminUserAuditLog {
                    uuid: &command.audit_log_uuid,
                    request_id: &command.request_id,
                    tenant_id: command.subject.tenant_id,
                    organization_id: command.subject.organization_id,
                    operator_id: command.subject.operator_id,
                    operator_type: command.subject.operator_type,
                    action: "create_user_api_key",
                    target_type: TARGET_TYPE_API_KEY,
                    target_id: api_key_id,
                    change_summary: serde_json::json!({
                    "action": "create_user_api_key",
                    "userId": command.user_id,
                    "apiKeyId": api_key_id,
                    "name": &command.name,
                    "keyPrefix": &command.key_prefix,
                    "storesSecretPlaintext": false
                    }),
                },
            )
            .await?;
            let item = load_api_key_by_id(
                &mut tx,
                api_key_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created api key could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit admin api key transaction", error)
            })?;
            Ok(item)
        })
    }

    fn delete_api_key<'a>(
        &'a self,
        command: DeleteAdminUserApiKeyCommand,
    ) -> AdminUserCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin admin api key transaction", error)
                })?;
            let deleted = revoke_api_key(&mut tx, &command).await?;
            if deleted {
                insert_audit_log(
                    &mut tx,
                    AdminUserAuditLog {
                        uuid: &command.audit_log_uuid,
                        request_id: &command.request_id,
                        tenant_id: command.subject.tenant_id,
                        organization_id: command.subject.organization_id,
                        operator_id: command.subject.operator_id,
                        operator_type: command.subject.operator_type,
                        action: "delete_user_api_key",
                        target_type: TARGET_TYPE_API_KEY,
                        target_id: command.api_key_id,
                        change_summary: serde_json::json!({
                        "action": "delete_user_api_key",
                        "apiKeyId": command.api_key_id
                        }),
                    },
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit admin api key transaction", error)
            })?;
            Ok(deleted)
        })
    }
}

async fn list_users(pool: &PgPool, query: ListAdminUsersQuery) -> DomainResult<AdminUserListPage> {
    let search = search_like_pattern(query.q.as_deref());
    let rows = sqlx::query(
        r#"
        SELECT
            u.id::bigint AS id,
            COALESCE(u.email, '') AS email,
            COALESCE(NULLIF(u.username, ''), u.email, 'user-' || u.id::text) AS username,
            COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), u.email, 'user-' || u.id::text) AS display_name,
            COALESCE(u.phone, '') AS mobile,
            COALESCE(NULLIF(m.membership_kind, ''), 'user') AS role_code,
            COALESCE(NULLIF(m.membership_kind, ''), 'standard') AS group_code,
            '0' AS balance,
            CASE LOWER(COALESCE(u.status, ''))
                WHEN 'active' THEN 1
                WHEN 'banned' THEN 2
                WHEN 'disabled' THEN 3
                WHEN 'inactive' THEN 4
            END AS user_status,
            COALESCE(u.last_login_at, u.updated_at, u.created_at)::text AS last_active,
            COALESCE(k.last_used_at::text, '') AS last_used,
            COALESCE(u.created_at::text, '') AS created_at,
            COALESCE(u.updated_at::text, '') AS updated_at,
            COUNT(*) OVER() AS total
        FROM iam_user u
        LEFT JOIN (
            SELECT tenant_id,
                   organization_id,
                   user_id,
                   COALESCE(
                       MAX(CASE WHEN LOWER(COALESCE(membership_kind, '')) LIKE '%admin%' THEN membership_kind END),
                       MIN(membership_kind)
                   ) AS membership_kind
            FROM iam_organization_membership
            WHERE organization_id = $1
              AND status = 'active'
            GROUP BY tenant_id, organization_id, user_id
        ) m
          ON m.tenant_id = u.tenant_id
         AND m.user_id = u.id
        LEFT JOIN (
            SELECT user_id, MAX(last_used_at) AS last_used_at
            FROM iam_gateway_api_key
            WHERE tenant_id = $2
              AND organization_id = $3
              AND deleted_at IS NULL
            GROUP BY user_id
        ) k ON k.user_id = u.id::bigint
        WHERE u.tenant_id = $4
          AND LOWER(COALESCE(u.status, '')) IN ('active', 'banned', 'disabled', 'inactive')
          AND (
              $5 IS NULL
              OR LOWER(COALESCE(u.email, '')) LIKE $6
              OR LOWER(COALESCE(u.username, '')) LIKE $7
              OR LOWER(COALESCE(u.display_name, '')) LIKE $8
              OR LOWER(COALESCE(u.phone, '')) LIKE $9
              OR u.id::text LIKE $10
          )
        ORDER BY u.created_at DESC NULLS LAST, u.id::bigint DESC
        LIMIT $11 OFFSET $12
        "#,
    )
    .bind(query.subject.organization_id.to_string())
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.subject.tenant_id.to_string())
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(search.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list admin users", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(user_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminUserListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn list_api_keys(
    pool: &PgPool,
    query: ListAdminUserApiKeysQuery,
) -> DomainResult<AdminUserApiKeyListPage> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            user_id,
            COALESCE(name, '') AS name,
            COALESCE(NULLIF(key_display_masked, ''), COALESCE(key_prefix, '') || '********') AS key_display_masked,
            status AS status,
            COUNT(*) OVER() AS total
        FROM iam_gateway_api_key
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND revoked_at IS NULL
          AND status = 1
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list admin api keys", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(api_key_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminUserApiKeyListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn ensure_user_identity_available(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    email: &str,
    username: &str,
) -> DomainResult<()> {
    let existing_id: Option<String> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM iam_user
        WHERE tenant_id = $1
          AND LOWER(COALESCE(status, '')) IN ('active', 'banned', 'disabled', 'inactive')
          AND (LOWER(email) = LOWER($2) OR LOWER(username) = LOWER($3))
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(tenant_id.to_string())
    .bind(email)
    .bind(username)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check user uniqueness", error))?;
    if existing_id.is_some() {
        Err(DomainError::conflict("email or username already exists"))
    } else {
        Ok(())
    }
}

async fn insert_user(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminUserCommand,
) -> DomainResult<i64> {
    let user_id = crate::infrastructure::sql::runtime_id::next_user_id("admin user creation")?;
    let user_id_text = user_id.to_string();
    let tenant_id = command.subject.tenant_id.to_string();
    let organization_id = command.subject.organization_id.to_string();
    let avatar = user_default_avatar_resource(&command.username);
    sqlx::query(
        r#"
        INSERT INTO iam_user
            (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, NULL, $6, $7, $8::jsonb, 'active', $9::timestamp AT TIME ZONE 'UTC', $9::timestamp AT TIME ZONE 'UTC')
        "#,
    )
    .bind(&user_id_text)
    .bind(&tenant_id)
    .bind(&command.username)
    .bind(&command.username)
    .bind(&command.email)
    .bind(media_resource_stable_id(&avatar))
    .bind(media_resource_object_blob_id(&avatar))
    .bind(avatar.to_string())
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(store_create_error)?;

    sqlx::query(
        r#"
        INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, 'standard', $5, 0, 'active', $6::timestamp AT TIME ZONE 'UTC', $6::timestamp AT TIME ZONE 'UTC', $6::timestamp AT TIME ZONE 'UTC')
        "#,
    )
    .bind(format!("member-{user_id_text}-admin-user"))
    .bind(&tenant_id)
    .bind(&organization_id)
    .bind(&user_id_text)
    .bind(&command.username)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create IAM organization membership", error))?;

    sqlx::query(
        r#"
        INSERT INTO iam_user_identity
            (id, tenant_id, user_id, provider, subject, email, created_at)
        VALUES
            ($1, $2, $3, 'email', $4, $5, $6::timestamp AT TIME ZONE 'UTC')
        "#,
    )
    .bind(format!("identity-{user_id_text}-admin-email"))
    .bind(&tenant_id)
    .bind(&user_id_text)
    .bind(&command.email)
    .bind(&command.email)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create IAM user email identity", error))?;

    Ok(user_id)
}

fn user_default_avatar_resource(username: &str) -> serde_json::Value {
    provider_asset_media_resource(
        "image",
        &format!("iam-user-avatar:{}", username.trim().to_ascii_lowercase()),
    )
}

async fn insert_cash_account(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminUserCommand,
    user_id: i64,
) -> DomainResult<String> {
    let account_id = account_id(&command.account_uuid);
    sqlx::query(
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code, available_amount, frozen_amount, version, status, created_at, updated_at)
        VALUES
            ($1, CAST($2 AS TEXT), CAST($3 AS TEXT), CAST($4 AS TEXT), $5, $6, $7, '0', 0, 'active', $8, $8)
        ON CONFLICT (tenant_id, organization_id, owner_user_id, asset_type, currency_code) DO UPDATE SET
            updated_at = excluded.updated_at
        "#,
    )
    .bind(&account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(user_id)
    .bind(CommerceAccountAssetType::Cash.as_str())
    .bind(CASH_CURRENCY_CODE)
    .bind(command.initial_balance.to_fixed_string(4))
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create user cash account", error))?;
    Ok(account_id)
}

async fn update_user_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminUserCommand,
) -> DomainResult<bool> {
    let status_code = command.status.as_deref().map(user_status_code);
    let user_id = command.user_id.to_string();
    let tenant_id = command.subject.tenant_id.to_string();
    let organization_id = command.subject.organization_id.to_string();
    let result = sqlx::query(
        r#"
        UPDATE iam_user
        SET username = COALESCE($1, username),
            status = COALESCE($2, status),
            updated_at = $3::timestamp AT TIME ZONE 'UTC'
        WHERE id = $4
          AND tenant_id = $5
          AND LOWER(COALESCE(status, '')) IN ('active', 'banned', 'disabled', 'inactive')
          AND EXISTS (
              SELECT 1
              FROM iam_organization_membership m
              WHERE m.tenant_id = iam_user.tenant_id
                AND m.organization_id = $6
                AND m.user_id = iam_user.id
                AND m.status = 'active'
          )
        "#,
    )
    .bind(command.username.as_deref())
    .bind(status_code)
    .bind(&command.requested_at)
    .bind(&user_id)
    .bind(&tenant_id)
    .bind(&organization_id)
    .execute(&mut **tx)
    .await
    .map_err(store_create_error)?;
    Ok(result.rows_affected() > 0)
}

async fn upsert_user_membership_role(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminUserCommand,
    role_code: &str,
) -> DomainResult<()> {
    let result = sqlx::query(
        r#"
        UPDATE iam_organization_membership
        SET membership_kind = $1,
            updated_at = $2::timestamp AT TIME ZONE 'UTC'
        WHERE tenant_id = $3
          AND organization_id = $4
          AND user_id = $5
          AND status = 'active'
        "#,
    )
    .bind(role_code)
    .bind(&command.requested_at)
    .bind(command.subject.tenant_id.to_string())
    .bind(command.subject.organization_id.to_string())
    .bind(command.user_id.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update IAM user membership role", error))?;
    if result.rows_affected() > 0 {
        return Ok(());
    }

    sqlx::query(
        r#"
        INSERT INTO iam_organization_membership
            (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, created_at, updated_at)
        VALUES
            ($1, $2, $3, $4, $5, NULL, 0, 'active', $6::timestamp AT TIME ZONE 'UTC', $6::timestamp AT TIME ZONE 'UTC', $6::timestamp AT TIME ZONE 'UTC')
        ON CONFLICT(tenant_id, organization_id, user_id, membership_kind) DO UPDATE SET
            status = 'active',
            updated_at = excluded.updated_at
        "#,
    )
    .bind(format!("member-{}-{role_code}-admin-user", command.user_id))
    .bind(command.subject.tenant_id.to_string())
    .bind(command.subject.organization_id.to_string())
    .bind(command.user_id.to_string())
    .bind(role_code)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to assign IAM user membership role", error))?;
    Ok(())
}

async fn ensure_cash_account(
    tx: &mut Transaction<'_, Postgres>,
    command: &AdjustAdminUserBalanceCommand,
) -> DomainResult<CashAccountRow> {
    if let Some(account) = load_cash_account(tx, command).await? {
        return Ok(account);
    }
    let account_id = account_id(&command.account_uuid);
    sqlx::query(
        r#"
        INSERT INTO commerce_account
            (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code, available_amount, frozen_amount, version, status, created_at, updated_at)
        VALUES
            ($1, CAST($2 AS TEXT), CAST($3 AS TEXT), CAST($4 AS TEXT), $5, $6, '0', '0', 0, 'active', $7, $7)
        ON CONFLICT (tenant_id, organization_id, owner_user_id, asset_type, currency_code) DO NOTHING
        "#,
    )
    .bind(&account_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.user_id)
    .bind(CommerceAccountAssetType::Cash.as_str())
    .bind(CASH_CURRENCY_CODE)
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create user cash account", error))?;
    load_cash_account(tx, command)
        .await?
        .ok_or_else(|| DomainError::new("created cash account could not be reloaded"))
}

async fn load_cash_account(
    tx: &mut Transaction<'_, Postgres>,
    command: &AdjustAdminUserBalanceCommand,
) -> DomainResult<Option<CashAccountRow>> {
    let row = sqlx::query(
        r#"
        SELECT id,
               COALESCE(available_amount, '0')::text AS available_amount,
               COALESCE(version, 0) AS version
        FROM commerce_account
        WHERE tenant_id = CAST($1 AS TEXT)
          AND organization_id = CAST($2 AS TEXT)
          AND owner_user_id = CAST($3 AS TEXT)
          AND asset_type = $4
          AND currency_code = $5
          AND status = 'active'
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 1
        FOR UPDATE
        "#,
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.user_id)
    .bind(CommerceAccountAssetType::Cash.as_str())
    .bind(CASH_CURRENCY_CODE)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load user cash account", error))?;
    row.map(|row| {
        Ok(CashAccountRow {
            id: row.try_get("id").map_err(row_error)?,
            available_amount: row.try_get("available_amount").map_err(row_error)?,
            version: integer_cell(&row, "version"),
        })
    })
    .transpose()
}

async fn update_account_balance(
    tx: &mut Transaction<'_, Postgres>,
    account: &CashAccountRow,
    balance_after: DecimalValue,
    requested_at: &str,
) -> DomainResult<()> {
    let result = sqlx::query(
        r#"
        UPDATE commerce_account
        SET available_amount = $1,
            updated_at = $2,
            version = COALESCE(version, 0) + 1
        WHERE id = $3
          AND version = $4
        "#,
    )
    .bind(balance_after.to_fixed_string(4))
    .bind(requested_at)
    .bind(&account.id)
    .bind(account.version)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update user balance", error))?;
    if result.rows_affected() != 1 {
        return Err(DomainError::conflict(
            "admin user balance update was not applied atomically",
        ));
    }
    Ok(())
}

async fn insert_account_history(
    tx: &mut Transaction<'_, Postgres>,
    command: &AdjustAdminUserBalanceCommand,
    account_id: &str,
    balance_before: DecimalValue,
    balance_after: DecimalValue,
) -> DomainResult<()> {
    let direction = if command.adjustment_type == "refund" {
        CommerceLedgerDirection::Debit
    } else {
        CommerceLedgerDirection::Credit
    };
    sqlx::query(
        r#"
        INSERT INTO commerce_account_ledger_entry
            (id, tenant_id, organization_id, account_id, owner_user_id, asset_type, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, source_type, source_id, remark, created_at)
        VALUES
            ($1, CAST($2 AS TEXT), CAST($3 AS TEXT), $4, CAST($5 AS TEXT), $6, $7, $8, $9, $10, $11, $11, $11, 'admin_user_balance_adjustment', CAST($12 AS TEXT), $13, $14)
        "#,
    )
    .bind(&command.account_history_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(account_id)
    .bind(command.user_id)
    .bind(CommerceAccountAssetType::Cash.as_str())
    .bind(direction.as_str())
    .bind(command.amount.to_fixed_string(4))
    .bind(balance_after.to_fixed_string(4))
    .bind(if command.adjustment_type == "refund" {
        "refund"
    } else {
        "recharge"
    })
    .bind(&command.request_id)
    .bind(command.user_id)
    .bind(format!("admin_{}", command.adjustment_type))
    .bind(&command.requested_at)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to insert account ledger entry", error))?;
    let _ = balance_before;
    Ok(())
}

async fn ensure_api_key_idempotency_available(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminUserApiKeyCommand,
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
    .bind(command.subject.tenant_id)
    .bind(&command.idempotency_key)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check api key idempotency", error))?;
    if existing_id.is_some() {
        Err(DomainError::conflict(
            "api key creation idempotency key has already been used",
        ))
    } else {
        Ok(())
    }
}

async fn find_default_upstream_account_group(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<i64>> {
    sqlx::query_scalar(
        r#"
        SELECT id
        FROM ai_upstream_account_group
        WHERE (tenant_id IS NULL OR tenant_id = $1)
          AND (organization_id IS NULL OR organization_id = $2)
          AND group_code = $3
          AND status = 1
          AND deleted_at IS NULL
        ORDER BY updated_at DESC NULLS LAST,
                 id ASC
        LIMIT 1
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(DEFAULT_ACCOUNT_GROUP_CODE)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load default upstream account group", error))
}

async fn ensure_default_upstream_account_group(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
    _source_uuid: &str,
    requested_at: &str,
) -> DomainResult<i64> {
    if let Some(group_id) =
        find_default_upstream_account_group(tx, tenant_id, organization_id).await?
    {
        return Ok(group_id);
    }

    let group_uuid = format!("default-channel-group-{tenant_id}-{organization_id}");
    let pricing_plan_id = find_default_pricing_plan_id(tx, tenant_id, organization_id).await?;
    let id = next_claw_runtime_id("ai_upstream_account_group")?;
    let row = sqlx::query_scalar(
        r#"
        INSERT INTO ai_upstream_account_group
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, group_name, group_code, description, group_type, environment, pricing_plan_id, pricing_plan_code, rate_multiplier, official_price_multiplier, billing_type, capacity_limit, allowed_origin, metadata, id)
        VALUES
            ($1, $2, $3, 1, 1, $4::timestamptz, $4::timestamptz, 0, $5, $6, '', 'default', 1, $7, $8, '1.000000'::numeric, '1.000000'::numeric, 1, 0, '{}'::jsonb, '{}'::jsonb, $9)
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
        RETURNING id
        "#,
    )
    .bind(&group_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(requested_at)
    .bind(DEFAULT_ACCOUNT_GROUP_NAME)
    .bind(DEFAULT_ACCOUNT_GROUP_CODE)
    .bind(pricing_plan_id)
    .bind(DEFAULT_PRICING_PLAN_CODE)
    .bind(id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to ensure default channel group", error))?;

    Ok(row)
}

async fn find_default_pricing_plan_id(
    tx: &mut Transaction<'_, Postgres>,
    tenant_id: i64,
    organization_id: i64,
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
    .bind(DEFAULT_PRICING_PLAN_CODE)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load default channel group pricing plan", error))
}

async fn insert_api_key(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminUserApiKeyCommand,
    group_id: i64,
) -> DomainResult<i64> {
    let id = next_claw_runtime_id("admin user api key")?;
    sqlx::query_scalar(
        r#"
        INSERT INTO iam_gateway_api_key
            (id, uuid, tenant_id, organization_id, user_id, account_group_id, name, key_prefix, key_display_masked, key_hash, hash_alg, secret_version, idempotency_key, status, created_at, updated_at, last_revealed_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1, $14::timestamp AT TIME ZONE 'UTC', $14::timestamp AT TIME ZONE 'UTC', CURRENT_TIMESTAMP)
        RETURNING id
        "#,
    )
    .bind(id)
    .bind(&command.api_key_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.user_id)
    .bind(group_id)
    .bind(&command.name)
    .bind(&command.key_prefix)
    .bind(&command.key_display_masked)
    .bind(&command.key_hash)
    .bind(&command.hash_alg)
    .bind(command.secret_version)
    .bind(&command.idempotency_key)
    .bind(&command.requested_at)
    .fetch_one(&mut **tx)
    .await
    .map_err(store_create_error)
}

async fn revoke_api_key(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminUserApiKeyCommand,
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
    .bind(command.subject.operator_id)
    .bind(command.api_key_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to revoke api key", error))?;
    Ok(result.rows_affected() > 0)
}

async fn user_exists(
    tx: &mut Transaction<'_, Postgres>,
    user_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<bool> {
    let existing_id: Option<String> = sqlx::query_scalar(
        r#"
        SELECT u.id
        FROM iam_user u
        JOIN iam_organization_membership m
          ON m.tenant_id = u.tenant_id
         AND m.user_id = u.id
         AND m.organization_id = $1
         AND m.status = 'active'
        WHERE u.id = $2
          AND u.tenant_id = $3
          AND LOWER(COALESCE(u.status, '')) IN ('active', 'banned', 'disabled', 'inactive')
        LIMIT 1
        "#,
    )
    .bind(organization_id.to_string())
    .bind(user_id.to_string())
    .bind(tenant_id.to_string())
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to check user existence", error))?;
    Ok(existing_id.is_some())
}

async fn load_user_by_id(
    tx: &mut Transaction<'_, Postgres>,
    user_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminUserItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            u.id::bigint AS id,
            COALESCE(u.email, '') AS email,
            COALESCE(NULLIF(u.username, ''), u.email, 'user-' || u.id::text) AS username,
            COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), u.email, 'user-' || u.id::text) AS display_name,
            COALESCE(u.phone, '') AS mobile,
            COALESCE(NULLIF(m.membership_kind, ''), 'user') AS role_code,
            COALESCE(NULLIF(m.membership_kind, ''), 'standard') AS group_code,
            '0' AS balance,
            CASE LOWER(COALESCE(u.status, ''))
                WHEN 'active' THEN 1
                WHEN 'banned' THEN 2
                WHEN 'disabled' THEN 3
                WHEN 'inactive' THEN 4
            END AS user_status,
            COALESCE(u.last_login_at, u.updated_at, u.created_at)::text AS last_active,
            COALESCE(k.last_used_at::text, '') AS last_used,
            COALESCE(u.created_at::text, '') AS created_at,
            COALESCE(u.updated_at::text, '') AS updated_at
        FROM iam_user u
        LEFT JOIN (
            SELECT tenant_id,
                   organization_id,
                   user_id,
                   COALESCE(
                       MAX(CASE WHEN LOWER(COALESCE(membership_kind, '')) LIKE '%admin%' THEN membership_kind END),
                       MIN(membership_kind)
                   ) AS membership_kind
            FROM iam_organization_membership
            WHERE organization_id = $1
              AND status = 'active'
            GROUP BY tenant_id, organization_id, user_id
        ) m
          ON m.tenant_id = u.tenant_id
         AND m.user_id = u.id
        LEFT JOIN (
            SELECT user_id, MAX(last_used_at) AS last_used_at
            FROM iam_gateway_api_key
            WHERE tenant_id = $2
              AND organization_id = $3
              AND deleted_at IS NULL
            GROUP BY user_id
        ) k ON k.user_id = u.id::bigint
        WHERE u.id = $4
          AND u.tenant_id = $5
          AND LOWER(COALESCE(u.status, '')) IN ('active', 'banned', 'disabled', 'inactive')
        LIMIT 1
        "#,
    )
    .bind(organization_id.to_string())
    .bind(tenant_id)
    .bind(organization_id)
    .bind(user_id.to_string())
    .bind(tenant_id.to_string())
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load admin user", error))?;
    row.map(user_from_row).transpose()
}

async fn load_api_key_by_id(
    tx: &mut Transaction<'_, Postgres>,
    api_key_id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminUserApiKeyItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            user_id,
            COALESCE(name, '') AS name,
            COALESCE(NULLIF(key_display_masked, ''), COALESCE(key_prefix, '') || '********') AS key_display_masked,
            status AS status
        FROM iam_gateway_api_key
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
        LIMIT 1
        "#,
    )
    .bind(api_key_id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load admin api key", error))?;
    row.map(api_key_from_row).transpose()
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    audit: AdminUserAuditLog<'_>,
) -> DomainResult<()> {
    let id = next_claw_runtime_id("ops_audit_log")?;
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary, id)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
        "#,
    )
    .bind(audit.uuid)
    .bind(audit.tenant_id)
    .bind(audit.organization_id)
    .bind(audit.action)
    .bind(audit.target_type)
    .bind(audit.target_id)
    .bind(audit.request_id)
    .bind(audit.operator_id)
    .bind(audit.operator_type)
    .bind(audit.change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write admin user audit log", error))?;
    Ok(())
}

fn user_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminUserItem> {
    let role_code: String = row.try_get("role_code").map_err(row_error)?;
    let group: String = row.try_get("group_code").map_err(row_error)?;
    let balance: String = row.try_get("balance").map_err(row_error)?;
    Ok(AdminUserItem {
        id: integer_cell(&row, "id"),
        email: row.try_get("email").map_err(row_error)?,
        username: row.try_get("username").map_err(row_error)?,
        display_name: row.try_get("display_name").map_err(row_error)?,
        mobile: row.try_get("mobile").map_err(row_error)?,
        role: role_label(&role_code),
        group,
        balance: balance_label(&balance)?,
        status: user_status_label(required_integer_cell(&row, "user_status", "user")?)?,
        last_active: timestamp_label(row.try_get("last_active").ok()),
        last_used: timestamp_label(row.try_get("last_used").ok()),
        created_at: timestamp_label(row.try_get("created_at").ok()),
        updated_at: timestamp_label(row.try_get("updated_at").ok()),
    })
}

fn api_key_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminUserApiKeyItem> {
    Ok(AdminUserApiKeyItem {
        id: integer_cell(&row, "id"),
        user_id: integer_cell(&row, "user_id"),
        name: row.try_get("name").map_err(row_error)?,
        key: row.try_get("key_display_masked").map_err(row_error)?,
        used: "0.000000".to_owned(),
        status: api_key_status_label(required_integer_cell(&row, "status", "api key")?)?,
    })
}

#[derive(Debug, Clone)]
struct CashAccountRow {
    id: String,
    available_amount: String,
    version: i64,
}

fn account_id(uuid: &str) -> String {
    let value = uuid.trim();
    if value.is_empty() {
        "admin-user-cash-account".to_owned()
    } else if value.starts_with("account-") {
        value.to_owned()
    } else {
        format!("account-{value}")
    }
}

fn user_status_code(status: &str) -> &'static str {
    match status {
        "banned" => "banned",
        _ => "active",
    }
}

fn user_status_label(status: i64) -> DomainResult<String> {
    match status {
        1 => Ok("active".to_owned()),
        2 => Ok("banned".to_owned()),
        3 => Ok("disabled".to_owned()),
        4 => Ok("inactive".to_owned()),
        value => Err(DomainError::new(format!(
            "invalid admin user status from database row: {value}"
        ))),
    }
}

fn api_key_status_label(status: i64) -> DomainResult<String> {
    match status {
        value if value == i64::from(API_KEY_STATUS_ACTIVE) => Ok("active".to_owned()),
        value if value == i64::from(API_KEY_STATUS_REVOKED) => Ok("disabled".to_owned()),
        value => Err(DomainError::new(format!(
            "invalid admin api key status from database row: {value}"
        ))),
    }
}

fn role_label(role_code: &str) -> String {
    if role_code.eq_ignore_ascii_case("admin") || role_code.to_ascii_lowercase().contains("admin") {
        "admin"
    } else {
        "user"
    }
    .to_owned()
}

fn balance_label(value: &str) -> DomainResult<String> {
    DecimalValue::parse(value)
        .map(|amount| format!("${}", amount.to_fixed_string(2)))
        .map_err(|_| DomainError::new(format!("invalid admin user balance: {value}")))
}

fn timestamp_label(value: Option<String>) -> String {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "-".to_owned())
}

fn search_like_pattern(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| format!("%{}%", value.to_ascii_lowercase()))
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
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
    source: &str,
) -> DomainResult<i64> {
    optional_integer_cell(row, column).ok_or_else(|| missing_status_error(source))
}

fn missing_status_error(source: &str) -> DomainError {
    match source {
        "user" => DomainError::new("missing admin user user status from database row"),
        "api key" => DomainError::new("missing admin user api key status from database row"),
        value => DomainError::new(format!(
            "missing admin user {value} status from database row"
        )),
    }
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}

fn store_create_error(error: sqlx::Error) -> DomainError {
    if is_unique_violation(&error) {
        DomainError::conflict("admin user uniqueness constraint was violated")
    } else {
        store_error("failed to write admin user data", error)
    }
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    error
        .as_database_error()
        .and_then(|database_error| database_error.code())
        .map(|code| code.as_ref() == "23505")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn balance_label_rejects_invalid_database_balance() {
        assert_eq!(
            "$12.30",
            balance_label("12.3").expect("valid balance must format")
        );

        let invalid = balance_label("not-money").expect_err("invalid admin user balance must fail");
        assert!(invalid
            .to_string()
            .contains("invalid admin user balance: not-money"));
    }
}
