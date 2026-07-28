use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::routing_config_change::{
    record_postgres_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminProviderSecretCommandFuture, AdminProviderSecretItem, AdminProviderSecretListPage,
    AdminProviderSecretStore, CreateAdminProviderSecretCommand, DeleteAdminProviderSecretCommand,
    ListAdminProviderSecretsQuery, UpdateAdminProviderSecretCommand,
};

const PROVIDER_SECRET_TARGET_TYPE: i32 = 31;

#[derive(Debug, Clone)]
pub struct PostgresAdminProviderSecretStore {
    pool: PgPool,
}

impl PostgresAdminProviderSecretStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminProviderSecretStore for PostgresAdminProviderSecretStore {
    fn list_provider_secrets<'a>(
        &'a self,
        query: ListAdminProviderSecretsQuery,
    ) -> AdminProviderSecretCommandFuture<'a, AdminProviderSecretListPage> {
        Box::pin(async move { list_provider_secrets(&self.pool, query).await })
    }

    fn create_provider_secret<'a>(
        &'a self,
        command: CreateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, AdminProviderSecretItem> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin provider secret transaction", error)
            })?;
            let id = insert_provider_secret(&mut tx, &command).await?;
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "create_provider_secret",
                id,
                serde_json::json!({
                    "action": "create_provider_secret",
                    "providerSecretId": id,
                    "providerCode": &command.supplier_code,
                    "secretStoredAsRef": true,
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
                "create_provider_secret",
                id,
                serde_json::json!({
                    "action": "create_provider_secret",
                    "providerSecretId": id,
                    "providerCode": &command.supplier_code,
                    "secretStoredAsRef": true,
                    "status": &command.status
                }),
            )
            .await?;
            record_postgres_ai_routing_config_change(
                &mut tx,
                provider_secret_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "create_provider_secret",
                    id,
                    serde_json::json!({
                        "providerSecretId": id,
                        "providerCode": &command.supplier_code,
                        "secretStoredAsRef": true,
                        "status": &command.status
                    }),
                ),
            )
            .await?;
            let item = load_provider_secret_by_id(
                &mut tx,
                id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?
            .ok_or_else(|| DomainError::new("created provider secret could not be reloaded"))?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit provider secret transaction", error)
            })?;
            Ok(item)
        })
    }

    fn update_provider_secret<'a>(
        &'a self,
        command: UpdateAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, Option<AdminProviderSecretItem>> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin provider secret transaction", error)
            })?;
            let updated = update_provider_secret(&mut tx, &command).await?;
            if !updated {
                tx.commit().await.map_err(|error| {
                    store_error("failed to commit provider secret transaction", error)
                })?;
                return Ok(None);
            }
            insert_config_snapshot(
                &mut tx,
                &command.config_snapshot_uuid,
                &command.request_id,
                command.subject.tenant_id,
                command.subject.organization_id,
                command.subject.operator_id,
                "update_provider_secret",
                command.secret_id,
                serde_json::json!({
                    "action": "update_provider_secret",
                    "providerSecretId": command.secret_id,
                    "providerChanged": command.supplier_code.is_some(),
                    "nameChanged": command.name.is_some(),
                    "authTypeChanged": command.auth_type.is_some(),
                    "secretRefChanged": command.secret_ref.is_some(),
                    "status": command.status
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
                "update_provider_secret",
                command.secret_id,
                serde_json::json!({
                    "action": "update_provider_secret",
                    "providerSecretId": command.secret_id,
                    "providerChanged": command.supplier_code.is_some(),
                    "nameChanged": command.name.is_some(),
                    "authTypeChanged": command.auth_type.is_some(),
                    "secretRefChanged": command.secret_ref.is_some(),
                    "status": command.status
                }),
            )
            .await?;
            record_postgres_ai_routing_config_change(
                &mut tx,
                provider_secret_routing_config_change(
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    &command.request_id,
                    &command.requested_at,
                    "update_provider_secret",
                    command.secret_id,
                    serde_json::json!({
                        "providerSecretId": command.secret_id,
                        "providerChanged": command.supplier_code.is_some(),
                        "nameChanged": command.name.is_some(),
                        "authTypeChanged": command.auth_type.is_some(),
                        "secretRefChanged": command.secret_ref.is_some(),
                        "statusChanged": command.status.is_some()
                    }),
                ),
            )
            .await?;
            let item = load_provider_secret_by_id(
                &mut tx,
                command.secret_id,
                command.subject.tenant_id,
                command.subject.organization_id,
            )
            .await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit provider secret transaction", error)
            })?;
            Ok(item)
        })
    }

    fn delete_provider_secret<'a>(
        &'a self,
        command: DeleteAdminProviderSecretCommand,
    ) -> AdminProviderSecretCommandFuture<'a, bool> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin provider secret transaction", error)
            })?;
            let deleted = soft_delete_provider_secret(&mut tx, &command).await?;
            if deleted {
                insert_config_snapshot(
                    &mut tx,
                    &command.config_snapshot_uuid,
                    &command.request_id,
                    command.subject.tenant_id,
                    command.subject.organization_id,
                    command.subject.operator_id,
                    "delete_provider_secret",
                    command.secret_id,
                    serde_json::json!({
                        "action": "delete_provider_secret",
                        "providerSecretId": command.secret_id
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
                    "delete_provider_secret",
                    command.secret_id,
                    serde_json::json!({
                        "action": "delete_provider_secret",
                        "providerSecretId": command.secret_id
                    }),
                )
                .await?;
                record_postgres_ai_routing_config_change(
                    &mut tx,
                    provider_secret_routing_config_change(
                        command.subject.tenant_id,
                        command.subject.organization_id,
                        command.subject.operator_id,
                        &command.request_id,
                        &command.requested_at,
                        "delete_provider_secret",
                        command.secret_id,
                        serde_json::json!({
                            "providerSecretId": command.secret_id,
                            "deleted": true
                        }),
                    ),
                )
                .await?;
            }
            tx.commit().await.map_err(|error| {
                store_error("failed to commit provider secret transaction", error)
            })?;
            Ok(deleted)
        })
    }
}

async fn list_provider_secrets(
    pool: &PgPool,
    query: ListAdminProviderSecretsQuery,
) -> DomainResult<AdminProviderSecretListPage> {
    let status = query.status.as_ref().map(|status| status_code(status));
    let search = query
        .q
        .as_ref()
        .map(|value| format!("%{}%", value.to_lowercase()));
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            uuid,
            tenant_id,
            organization_id,
            COALESCE(supplier_code, '') AS supplier_code,
            COALESCE(account_code, '') AS account_code,
            COALESCE(account_name, '') AS account_name,
            auth_type,
            COALESCE(secret_ref, '') AS secret_ref,
            COALESCE(masked_label, '') AS masked_label,
            status,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at,
            CAST(deleted_at AS TEXT) AS deleted_at,
            COUNT(*) OVER() AS total
        FROM integration_provider_account
        WHERE tenant_id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
          AND ($3 IS NULL OR supplier_code = $4)
          AND ($5 IS NULL OR status = $6)
          AND (
              $7 IS NULL
              OR LOWER(COALESCE(account_name, '')) LIKE $7
              OR LOWER(COALESCE(supplier_code, '')) LIKE $7
          )
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT $8 OFFSET $9
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(query.supplier_code.as_deref())
    .bind(query.supplier_code.as_deref())
    .bind(status)
    .bind(status)
    .bind(search.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(|error| store_error("failed to list provider secrets", error))?;

    let total = rows
        .first()
        .and_then(|row| row.try_get::<i64, _>("total").ok())
        .unwrap_or(0);
    let items = rows
        .into_iter()
        .map(item_from_row)
        .collect::<DomainResult<Vec<_>>>()?;
    Ok(AdminProviderSecretListPage {
        items,
        total,
        page_no: query.page_no,
        page_size: query.page_size,
    })
}

async fn insert_provider_secret(
    tx: &mut Transaction<'_, Postgres>,
    command: &CreateAdminProviderSecretCommand,
) -> DomainResult<i64> {
    let secret_id = next_claw_runtime_id("integration_provider_account")?;
    let auth_config = serde_json::json!({
        "authType": &command.auth_type,
        "secretStoredAsRef": true
    })
    .to_string();
    sqlx::query_scalar(
        r#"
        INSERT INTO integration_provider_account
            (uuid, tenant_id, organization_id, data_scope, status, created_at, updated_at, version, supplier_code, account_code, account_name, auth_type, credential_profile, auth_config, secret_ref, secret_hash, masked_label, consecutive_error_count, risk_level, id)
        VALUES
            ($1, $2, $3, 1, $4, $5::timestamptz, $6::timestamptz, 0, $7, $8, $9, $10, 1, $11::jsonb, $12, $13, $14, 0, 1, $15)
        RETURNING id
        "#,
    )
    .bind(&command.account_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(status_code(&command.status))
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(&command.supplier_code)
    .bind(&command.account_code)
    .bind(&command.name)
    .bind(auth_type_code(&command.auth_type))
    .bind(auth_config)
    .bind(&command.secret_ref)
    .bind(digest_hex(&command.secret_ref))
    .bind(&command.masked_label)
    .bind(secret_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| store_error("failed to create provider secret", error))
}

async fn update_provider_secret(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminProviderSecretCommand,
) -> DomainResult<bool> {
    let secret_hash = command
        .secret_ref
        .as_ref()
        .map(|secret_ref| digest_hex(secret_ref));
    let auth_config = if command.auth_type.is_some() || command.secret_ref.is_some() {
        Some(
            serde_json::json!({
                "authType": command.auth_type.as_deref(),
                "secretStoredAsRef": true,
                "secretRefChanged": command.secret_ref.is_some()
            })
            .to_string(),
        )
    } else {
        None
    };
    let result = sqlx::query(
        r#"
        UPDATE integration_provider_account
        SET supplier_code = COALESCE($1, supplier_code),
            account_name = COALESCE($2, account_name),
            auth_type = COALESCE($3, auth_type),
            auth_config = COALESCE($4::jsonb, auth_config),
            secret_ref = COALESCE($5, secret_ref),
            secret_hash = COALESCE($6, secret_hash),
            masked_label = COALESCE($7, masked_label),
            status = COALESCE($8, status),
            updated_at = $9::timestamptz,
            version = COALESCE(version, 0) + 1
        WHERE id = $10
          AND tenant_id = $11
          AND organization_id = $12
          AND deleted_at IS NULL
        "#,
    )
    .bind(command.supplier_code.as_deref())
    .bind(command.name.as_deref())
    .bind(
        command
            .auth_type
            .as_ref()
            .map(|auth_type| auth_type_code(auth_type)),
    )
    .bind(auth_config)
    .bind(command.secret_ref.as_deref())
    .bind(secret_hash)
    .bind(command.masked_label.as_deref())
    .bind(command.status.as_ref().map(|status| status_code(status)))
    .bind(&command.requested_at)
    .bind(command.secret_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to update provider secret", error))?;

    Ok(result.rows_affected() > 0)
}

async fn soft_delete_provider_secret(
    tx: &mut Transaction<'_, Postgres>,
    command: &DeleteAdminProviderSecretCommand,
) -> DomainResult<bool> {
    let result = sqlx::query(
        r#"
        UPDATE integration_provider_account
        SET status = -1,
            deleted_at = $1::timestamptz,
            updated_at = $2::timestamptz,
            version = COALESCE(version, 0) + 1
        WHERE id = $3
          AND tenant_id = $4
          AND organization_id = $5
          AND deleted_at IS NULL
        "#,
    )
    .bind(&command.requested_at)
    .bind(&command.requested_at)
    .bind(command.secret_id)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to delete provider secret", error))?;

    Ok(result.rows_affected() > 0)
}

async fn load_provider_secret_by_id(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> DomainResult<Option<AdminProviderSecretItem>> {
    let row = sqlx::query(
        r#"
        SELECT
            id,
            uuid,
            tenant_id,
            organization_id,
            COALESCE(supplier_code, '') AS supplier_code,
            COALESCE(account_code, '') AS account_code,
            COALESCE(account_name, '') AS account_name,
            auth_type,
            COALESCE(secret_ref, '') AS secret_ref,
            COALESCE(masked_label, '') AS masked_label,
            status,
            CAST(created_at AS TEXT) AS created_at,
            CAST(updated_at AS TEXT) AS updated_at,
            CAST(deleted_at AS TEXT) AS deleted_at
        FROM integration_provider_account
        WHERE id = $1
          AND tenant_id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        LIMIT 1
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| store_error("failed to load provider secret", error))?;

    row.map(item_from_row).transpose()
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
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(audit_log_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(action)
    .bind(PROVIDER_SECRET_TARGET_TYPE)
    .bind(target_id)
    .bind(request_id)
    .bind(operator_id)
    .bind(operator_type)
    .bind(change_summary.to_string())
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write provider secret audit log", error))?;
    Ok(())
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    config_snapshot_uuid: &str,
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
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, 1, $8, 'integration_provider_account', $9::jsonb, $10::jsonb, $11, $12::timestamptz, $13)
        "#,
    )
    .bind(next_claw_runtime_id("ops_config_snapshot")?)
    .bind(config_snapshot_uuid)
    .bind(tenant_id)
    .bind(organization_id)
    .bind(operator_id)
    .bind(request_id)
    .bind(format!(
        "provider-secret-{action}-{target_id}-{config_snapshot_uuid}"
    ))
    .bind(PROVIDER_SECRET_TARGET_TYPE)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(requested_at)
    .bind(operator_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write provider secret config snapshot", error))?;
    Ok(())
}

fn provider_secret_routing_config_change<'a>(
    tenant_id: i64,
    organization_id: i64,
    operator_id: i64,
    request_id: &'a str,
    requested_at: &'a str,
    action: &'a str,
    provider_secret_id: i64,
    event_payload: serde_json::Value,
) -> AiRoutingConfigChange<'a> {
    AiRoutingConfigChange {
        tenant_id,
        organization_id,
        operator_id,
        request_id,
        requested_at,
        changed_object_type: "integration_provider_account",
        changed_object_id: provider_secret_id,
        action,
        event_payload,
    }
}

fn item_from_row(row: sqlx::postgres::PgRow) -> DomainResult<AdminProviderSecretItem> {
    Ok(AdminProviderSecretItem {
        id: row.try_get("id").map_err(row_error)?,
        uuid: row.try_get("uuid").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        supplier_code: row.try_get("supplier_code").map_err(row_error)?,
        account_code: row.try_get("account_code").map_err(row_error)?,
        name: row.try_get("account_name").map_err(row_error)?,
        auth_type: auth_type_label(required_integer_cell(&row, "auth_type", "auth_type")?)?,
        secret_ref: row.try_get("secret_ref").map_err(row_error)?,
        masked_label: row.try_get("masked_label").map_err(row_error)?,
        status: status_label(required_integer_cell(&row, "status", "status")?)?,
        created_at: row.try_get("created_at").map_err(row_error)?,
        updated_at: row.try_get("updated_at").map_err(row_error)?,
        deleted_at: row.try_get("deleted_at").ok().flatten(),
    })
}

fn auth_type_code(value: &str) -> i32 {
    match value {
        "GCP Vertex OAuth" => 2,
        "AWS Bedrock" => 3,
        "Azure OpenAI" => 4,
        "Claude Code" => 5,
        _ => 1,
    }
}

fn auth_type_label(value: i64) -> DomainResult<String> {
    match value {
        1 => Ok("Standard API Key"),
        2 => Ok("GCP Vertex OAuth"),
        3 => Ok("AWS Bedrock"),
        4 => Ok("Azure OpenAI"),
        5 => Ok("Claude Code"),
        value => Err(DomainError::new(format!(
            "invalid admin provider secret auth_type from database row: {value}"
        ))),
    }
    .map(str::to_owned)
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
        -1 => Ok("deleted"),
        0 => Ok("disabled"),
        1 => Ok("active"),
        value => Err(DomainError::new(format!(
            "invalid admin provider secret status from database row: {value}"
        ))),
    }
    .map(str::to_owned)
}

fn digest_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    hex::encode(hasher.finalize())
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

fn missing_integer_cell_error(field: &str) -> DomainError {
    match field {
        "auth_type" => {
            DomainError::new("missing admin provider secret auth_type from database row")
        }
        "status" => DomainError::new("missing admin provider secret status from database row"),
        _ => DomainError::new(format!(
            "missing admin provider secret {field} from database row"
        )),
    }
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    if let sqlx::Error::Database(database_error) = &error {
        if database_error
            .code()
            .map(|code| code == "23505")
            .unwrap_or(false)
        {
            return DomainError::conflict(format!("{context}: provider secret already exists"));
        }
    }
    redacted_store_error(context, error)
}
