use sqlx::{PgPool, Postgres, Transaction};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::sql_admin_module_entry::{
    entries_from_payload, entries_payload, entries_snapshot_payload,
    ADMIN_MODULE_ENTRY_AUDIT_TARGET_TYPE, ADMIN_MODULE_ENTRY_SOURCE_TABLE,
    CONFIG_SCOPE_ADMIN_SHELL, CONFIG_TYPE_ADMIN_MODULE_ENTRY,
};
use crate::infrastructure::sql::sql_hash::digest_hex;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    AdminModuleEntries, AdminModuleEntryFuture, AdminModuleEntryStore,
    GetAdminModuleEntriesQuery, UpdateAdminModuleEntriesCommand,
};

#[derive(Debug, Clone)]
pub struct PostgresAdminModuleEntryStore {
    pool: PgPool,
}

impl PostgresAdminModuleEntryStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminModuleEntryStore for PostgresAdminModuleEntryStore {
    fn get_admin_module_entries<'a>(
        &'a self,
        query: GetAdminModuleEntriesQuery,
    ) -> AdminModuleEntryFuture<'a, AdminModuleEntries> {
        Box::pin(async move { load_admin_module_entries(&self.pool, query).await })
    }

    fn update_admin_module_entries<'a>(
        &'a self,
        command: UpdateAdminModuleEntriesCommand,
    ) -> AdminModuleEntryFuture<'a, AdminModuleEntries> {
        Box::pin(async move {
            let mut tx = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin admin module entry transaction", error)
            })?;
            insert_config_snapshot(&mut tx, &command).await?;
            insert_audit_log(&mut tx, &command).await?;
            tx.commit().await.map_err(|error| {
                store_error("failed to commit admin module entry transaction", error)
            })?;
            Ok(command.entries)
        })
    }
}

async fn load_admin_module_entries(
    pool: &PgPool,
    query: GetAdminModuleEntriesQuery,
) -> DomainResult<AdminModuleEntries> {
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
    .bind(ADMIN_MODULE_ENTRY_SOURCE_TABLE)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("failed to load admin module entries", error))?;

    match payload {
        Some(payload) => entries_from_payload(&payload),
        None => Ok(AdminModuleEntries::default()),
    }
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminModuleEntriesCommand,
) -> DomainResult<()> {
    let payload = entries_snapshot_payload(&command.entries)?;
    let snapshot_no = format!("admin-module-entry-{}", command.config_snapshot_uuid);
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (id, uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by)
        VALUES
            ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14::timestamptz, $15)
        "#,
    )
    .bind(next_cloud_runtime_id("ops_config_snapshot")?)
    .bind(&command.config_snapshot_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.operator_id)
    .bind(&command.request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ADMIN_SHELL)
    .bind(CONFIG_TYPE_ADMIN_MODULE_ENTRY)
    .bind(ADMIN_MODULE_ENTRY_SOURCE_TABLE)
    .bind(serde_json::json!(["admin-module-entries"]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write admin module entry config snapshot", error))?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpdateAdminModuleEntriesCommand,
) -> DomainResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (id, uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary)
        VALUES
            ($1, $2, $3, $4, 'update_admin_module_entries', $5, 0, $6, $7, $8, $9::jsonb)
        "#,
    )
    .bind(next_cloud_runtime_id("ops_audit_log")?)
    .bind(&command.audit_log_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(ADMIN_MODULE_ENTRY_AUDIT_TARGET_TYPE)
    .bind(&command.request_id)
    .bind(command.subject.operator_id)
    .bind(command.subject.operator_type)
    .bind(change_summary(&command.entries)?)
    .execute(&mut **tx)
    .await
    .map_err(|error| store_error("failed to write admin module entry audit log", error))?;
    Ok(())
}

fn change_summary(entries: &AdminModuleEntries) -> DomainResult<String> {
    let entries = serde_json::from_str::<serde_json::Value>(&entries_payload(entries)?)
        .map_err(|error| DomainError::new(error.to_string()))?;
    Ok(serde_json::json!({
        "action": "update_admin_module_entries",
        "entries": entries.get("entries").cloned().unwrap_or(serde_json::Value::Null)
    })
    .to_string())
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
