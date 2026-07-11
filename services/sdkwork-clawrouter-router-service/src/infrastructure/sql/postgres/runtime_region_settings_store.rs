use sqlx::{PgPool, Postgres, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::iam_scope_resolver::{
    resolve_postgres_iam_scope_domain, IamScopeResolveOptions,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::infrastructure::sql::sql_hash::digest_hex;
use crate::infrastructure::sql::sql_runtime_region_settings::{
    settings_from_payload, settings_payload, settings_snapshot_payload,
    CONFIG_SCOPE_RUNTIME_REGION, CONFIG_TYPE_RUNTIME_REGION_SETTINGS,
    RUNTIME_REGION_SETTINGS_AUDIT_TARGET_TYPE, RUNTIME_REGION_SETTINGS_SOURCE_TABLE,
};
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    GetRuntimeRegionSettingsQuery, GetRuntimeRegionSettingsScopeQuery, RuntimeRegionSettings,
    RuntimeRegionSettingsFuture, RuntimeRegionSettingsStore, UpdateRuntimeRegionSettingsCommand,
};

#[derive(Debug, Clone)]
pub struct PostgresRuntimeRegionSettingsStore {
    pool: PgPool,
}

impl PostgresRuntimeRegionSettingsStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl RuntimeRegionSettingsStore for PostgresRuntimeRegionSettingsStore {
    fn get_runtime_region_settings<'a>(
        &'a self,
        query: GetRuntimeRegionSettingsQuery,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
        Box::pin(async move { load_runtime_region_settings(&self.pool, query).await })
    }

    fn get_runtime_region_settings_for_scope<'a>(
        &'a self,
        query: GetRuntimeRegionSettingsScopeQuery,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
        Box::pin(async move { load_runtime_region_settings_for_scope(&self.pool, query).await })
    }

    fn update_runtime_region_settings<'a>(
        &'a self,
        command: UpdateRuntimeRegionSettingsCommand,
    ) -> RuntimeRegionSettingsFuture<'a, RuntimeRegionSettings> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin runtime region settings transaction", error)
            })?;
            insert_config_snapshot(&mut tx, &command).await?;
            insert_audit_log(&mut tx, &command).await?;
            tx.commit().await.map_err(|error| {
                store_error(
                    "failed to commit runtime region settings transaction",
                    error,
                )
            })?;
            Ok(command.settings)
        })
    }
}

async fn load_runtime_region_settings_for_scope(
    pool: &PgPool,
    query: GetRuntimeRegionSettingsScopeQuery,
) -> DomainResult<RuntimeRegionSettings> {
    let (tenant_id, organization_id) = resolve_runtime_region_scope(
        pool,
        query.tenant_code.as_deref(),
        query.organization_code.as_deref(),
    )
    .await?;
    load_runtime_region_settings(
        pool,
        GetRuntimeRegionSettingsQuery {
            subject: crate::ports::RuntimeRegionSettingsSubject {
                tenant_id,
                organization_id,
                operator_id: 0,
                operator_type: 0,
            },
        },
    )
    .await
}

async fn load_runtime_region_settings(
    pool: &PgPool,
    query: GetRuntimeRegionSettingsQuery,
) -> DomainResult<RuntimeRegionSettings> {
    let payload = sqlx::query_scalar::<_, String>(
        r#"
        SELECT COALESCE(config_payload::text, '')
        FROM ops_config_snapshot
        WHERE tenant_id = $1
          AND organization_id = $2
          AND status = 1
          AND source_table = $3
        ORDER BY published_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
        "#,
    )
    .bind(query.subject.tenant_id)
    .bind(query.subject.organization_id)
    .bind(RUNTIME_REGION_SETTINGS_SOURCE_TABLE)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load runtime region settings", error))?;

    match payload {
        Some(payload) => settings_from_payload(&payload),
        None => Ok(RuntimeRegionSettings::default()),
    }
}

async fn resolve_runtime_region_scope(
    pool: &PgPool,
    tenant_code: Option<&str>,
    organization_code: Option<&str>,
) -> DomainResult<(i64, i64)> {
    resolve_postgres_iam_scope_domain(
        pool,
        tenant_code,
        organization_code,
        IamScopeResolveOptions::default(),
        "failed to load runtime region IAM tenant",
        "failed to load runtime region IAM organization",
    )
    .await
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateRuntimeRegionSettingsCommand,
) -> DomainResult<()> {
    let payload = settings_snapshot_payload(&command.settings)?;
    let snapshot_no = format!(
        "runtime-region-settings-update-{}",
        command.config_snapshot_uuid
    );
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by)
        VALUES
            ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14::timestamptz, $15)
        "#,
    )
    .bind(next_claw_runtime_id("ops_config_snapshot")?)
    .bind(&command.config_snapshot_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.operator_id)
    .bind(&command.request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_RUNTIME_REGION)
    .bind(CONFIG_TYPE_RUNTIME_REGION_SETTINGS)
    .bind(RUNTIME_REGION_SETTINGS_SOURCE_TABLE)
    .bind(serde_json::json!(["runtime-region-settings"]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write runtime region settings config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateRuntimeRegionSettingsCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, 'update_runtime_region_settings', $5, 0, $6, $7, $8, $9::jsonb)
        "#,
    )
    .bind(next_claw_runtime_id("ops_audit_log")?)
    .bind(&command.audit_log_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(RUNTIME_REGION_SETTINGS_AUDIT_TARGET_TYPE)
    .bind(&command.request_id)
    .bind(command.subject.operator_id)
    .bind(command.subject.operator_type)
    .bind(change_summary(&command.settings)?)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write runtime region settings audit log", error))?;
    Ok(())
}

fn change_summary(settings: &RuntimeRegionSettings) -> DomainResult<String> {
    let settings = serde_json::from_str::<serde_json::Value>(&settings_payload(settings)?)
        .map_err(|error| DomainError::new(error.to_string()))?;
    Ok(serde_json::json!({
        "action": "update_runtime_region_settings",
        "settings": settings
    })
    .to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
