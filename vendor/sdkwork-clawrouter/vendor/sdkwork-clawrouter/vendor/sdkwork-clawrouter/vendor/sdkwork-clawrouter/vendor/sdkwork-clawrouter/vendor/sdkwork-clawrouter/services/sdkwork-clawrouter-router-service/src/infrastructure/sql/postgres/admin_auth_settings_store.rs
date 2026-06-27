use sqlx::{PgPool, Postgres, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::iam_scope_resolver::{
    resolve_postgres_iam_scope_domain, IamScopeResolveOptions,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_admin_auth_settings::{
    settings_from_payload, settings_payload, settings_snapshot_payload,
    AUTH_SETTINGS_AUDIT_TARGET_TYPE, AUTH_SETTINGS_SOURCE_TABLE, CONFIG_SCOPE_AUTH,
    CONFIG_TYPE_AUTH_SETTINGS,
};
use crate::infrastructure::sql::sql_hash::digest_hex;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminAuthSettings, AdminAuthSettingsFuture, AdminAuthSettingsStore, GetAdminAuthSettingsQuery,
    GetAdminAuthSettingsScopeQuery, UpdateAdminAuthSettingsCommand,
};

#[derive(Debug, Clone)]
pub struct PostgresAdminAuthSettingsStore {
    pool: PgPool,
}

impl PostgresAdminAuthSettingsStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminAuthSettingsStore for PostgresAdminAuthSettingsStore {
    fn get_auth_settings<'a>(
        &'a self,
        query: GetAdminAuthSettingsQuery,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings> {
        Box::pin(async move { load_auth_settings(&self.pool, query).await })
    }

    fn get_auth_settings_for_scope<'a>(
        &'a self,
        query: GetAdminAuthSettingsScopeQuery,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings> {
        Box::pin(async move { load_auth_settings_for_scope(&self.pool, query).await })
    }

    fn update_auth_settings<'a>(
        &'a self,
        command: UpdateAdminAuthSettingsCommand,
    ) -> AdminAuthSettingsFuture<'a, AdminAuthSettings> {
        Box::pin(async move {
            let mut tx =
                self.pool.begin().await.map_err(|error| {
                    store_error("failed to begin auth settings transaction", error)
                })?;
            insert_config_snapshot(&mut tx, &command).await?;
            insert_audit_log(&mut tx, &command).await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit auth settings transaction", error)
            })?;
            Ok(command.settings)
        })
    }
}

async fn load_auth_settings_for_scope(
    pool: &PgPool,
    query: GetAdminAuthSettingsScopeQuery,
) -> DomainResult<AdminAuthSettings> {
    let (tenant_id, organization_id) = resolve_auth_settings_scope(
        pool,
        query.tenant_code.as_deref(),
        query.organization_code.as_deref(),
    )
    .await?;
    load_auth_settings(
        pool,
        GetAdminAuthSettingsQuery {
            subject: crate::ports::AdminAuthSettingsSubject {
                tenant_id,
                organization_id,
                operator_id: 0,
                operator_type: 0,
            },
        },
    )
    .await
}

async fn load_auth_settings(
    pool: &PgPool,
    query: GetAdminAuthSettingsQuery,
) -> DomainResult<AdminAuthSettings> {
    let payload = sqlx::query_scalar::<_, String>(
        r#"
        SELECT COALESCE(config_payload::text, '')
        FROM ops_config_snapshot
        WHERE tenant_id = $1
          AND organization_id = $2
          AND status = 1
          AND source_table = $3
          AND deleted_at IS NULL
        ORDER BY published_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(AUTH_SETTINGS_SOURCE_TABLE)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load auth settings", error))?;

    match payload {
        Some(payload) => settings_from_payload(&payload),
        None => Ok(AdminAuthSettings::default()),
    }
}

async fn resolve_auth_settings_scope(
    pool: &PgPool,
    tenant_code: Option<&str>,
    organization_code: Option<&str>,
) -> DomainResult<(i64, i64)> {
    resolve_postgres_iam_scope_domain(
        pool,
        tenant_code,
        organization_code,
        IamScopeResolveOptions::AUTH_SETTINGS,
        "failed to load auth settings IAM tenant",
        "failed to load auth settings IAM organization",
    )
    .await
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminAuthSettingsCommand,
) -> DomainResult<()> {
    let payload = settings_snapshot_payload(&command.settings)?;
    let snapshot_no = format!("auth-settings-update-{}", command.config_snapshot_uuid);
    let snapshot_id = next_claw_runtime_id("auth settings config snapshot")?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by)
        VALUES
            ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14::timestamptz, $15)
        "#,
    )
    .bind(snapshot_id)
    .bind(&command.config_snapshot_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.operator_id)
    .bind(&command.request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_AUTH)
    .bind(CONFIG_TYPE_AUTH_SETTINGS)
    .bind(AUTH_SETTINGS_SOURCE_TABLE)
    .bind(serde_json::json!(["auth-settings"]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write auth settings config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminAuthSettingsCommand,
) -> DomainResult<()> {
    let audit_id = next_claw_runtime_id("auth settings audit log")?;
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, 'update_auth_settings', $5, 0, $6, $7, $8, $9::jsonb)
        "#,
    )
    .bind(audit_id)
    .bind(&command.audit_log_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(AUTH_SETTINGS_AUDIT_TARGET_TYPE)
    .bind(&command.request_id)
    .bind(command.subject.operator_id)
    .bind(command.subject.operator_type)
    .bind(change_summary(&command.settings)?)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write auth settings audit log", error))?;
    Ok(())
}

fn change_summary(settings: &AdminAuthSettings) -> DomainResult<String> {
    let settings = serde_json::from_str::<serde_json::Value>(&settings_payload(settings)?)
        .map_err(|error| DomainError::new(error.to_string()))?;
    Ok(serde_json::json!({
        "action": "update_auth_settings",
        "settings": settings
    })
    .to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
