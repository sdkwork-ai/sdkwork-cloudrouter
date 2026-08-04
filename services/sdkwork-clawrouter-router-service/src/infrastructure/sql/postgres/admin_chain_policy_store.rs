//! PostgreSQL admin store for `iam_gateway_chain_policy`.

use async_trait::async_trait;
use sqlx::{PgPool, Postgres, Row, Transaction};

use crate::infrastructure::sql::routing_config_change::{
    record_postgres_ai_routing_config_change, AiRoutingConfigChange,
};
use crate::infrastructure::sql::runtime_id::next_claw_runtime_id;
use crate::ports::{
    AdminChainPolicyItem, AdminChainPolicyStore, AdminChainPolicyStoreError,
    UpsertChainPolicyCommand,
};

const CONFIG_SCOPE_ROUTER: i32 = 10;
const CONFIG_TYPE_CHAIN_POLICY: i32 = 20;

/// Admin store over the gateway chain policy table.
#[derive(Debug, Clone)]
pub struct PostgresAdminChainPolicyStore {
    pool: PgPool,
}

impl PostgresAdminChainPolicyStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AdminChainPolicyStore for PostgresAdminChainPolicyStore {
    async fn get_chain_policy(
        &self,
        scope_type: i32,
        scope_id: i64,
    ) -> Option<AdminChainPolicyItem> {
        let row = sqlx::query(
            "SELECT id, scope_type, scope_id, COALESCE(policy_name, '') AS policy_name, payload, updated_at::text AS updated_at
             FROM iam_gateway_chain_policy
             WHERE status = 1
               AND deleted_at IS NULL
               AND scope_type = $1
               AND scope_id = $2
             ORDER BY version DESC, id DESC
             LIMIT 1",
        )
        .bind(scope_type)
        .bind(scope_id)
        .fetch_optional(&self.pool)
        .await
        .ok()
        .flatten()?;
        Some(item_from_row(&row))
    }

    async fn upsert_chain_policy(
        &self,
        command: UpsertChainPolicyCommand,
    ) -> Result<AdminChainPolicyItem, AdminChainPolicyStoreError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("failed to begin chain policy transaction", error))?;
        let id = upsert_chain_policy_row(&mut tx, &command).await?;
        let config_payload = serde_json::json!({
            "action": "upsert_chain_policy",
            "chainPolicyId": id,
            "scopeType": command.scope_type,
            "scopeId": command.scope_id,
            "policyName": &command.policy_name,
            "payload": command.payload,
        });
        insert_config_snapshot(&mut tx, &command, id, config_payload.clone()).await?;
        insert_audit_log(&mut tx, &command, id, config_payload.clone()).await?;
        record_postgres_ai_routing_config_change(
            &mut tx,
            AiRoutingConfigChange {
                tenant_id: command.subject.tenant_id,
                organization_id: command.subject.organization_id,
                operator_id: command.subject.operator_id,
                request_id: &command.request_id,
                requested_at: &command.requested_at,
                changed_object_type: "gateway_chain_policy",
                changed_object_id: id,
                action: "upsert_chain_policy",
                event_payload: config_payload,
            },
        )
        .await
        .map_err(|error| {
            AdminChainPolicyStoreError::system(format!(
                "failed to record chain policy config change: {error}"
            ))
        })?;
        let item = load_chain_policy_by_id(
            &mut tx,
            id,
            command.subject.tenant_id,
            command.subject.organization_id,
        )
        .await?
        .ok_or_else(|| {
            AdminChainPolicyStoreError::system("created chain policy could not be reloaded")
        })?;
        tx.commit()
            .await
            .map_err(|error| store_error("failed to commit chain policy transaction", error))?;
        Ok(item)
    }
}

async fn upsert_chain_policy_row(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpsertChainPolicyCommand,
) -> Result<i64, AdminChainPolicyStoreError> {
    let existing: Option<(i64, i64)> = sqlx::query_as(
        "SELECT id, version
         FROM iam_gateway_chain_policy
         WHERE status = 1
           AND deleted_at IS NULL
           AND tenant_id = $1
           AND organization_id = $2
           AND scope_type = $3
           AND scope_id = $4
         ORDER BY id DESC
         LIMIT 1",
    )
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.scope_type)
    .bind(command.scope_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_error| {
        AdminChainPolicyStoreError::system(format!(
            "failed to find existing chain policy: {}",
            "database operation failed"
        ))
    })?;
    let (id, version) = match existing {
        Some((id, version)) => (id, version + 1),
        None => (
            next_claw_runtime_id("iam_gateway_chain_policy").map_err(|error| {
                AdminChainPolicyStoreError::system(format!(
                    "failed to allocate chain policy id: {error}"
                ))
            })?,
            0,
        ),
    };
    let payload = command.payload.to_string();
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_chain_policy
            (id, uuid, tenant_id, organization_id, status, version, policy_name, scope_type, scope_id, payload, effective_from, effective_to)
        VALUES
            ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9::jsonb, NULL, NULL)
        ON CONFLICT (id) DO UPDATE SET
            policy_name = EXCLUDED.policy_name,
            scope_type = EXCLUDED.scope_type,
            scope_id = EXCLUDED.scope_id,
            payload = EXCLUDED.payload,
            version = EXCLUDED.version,
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(id)
    .bind(&command.audit_log_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(version)
    .bind(&command.policy_name)
    .bind(command.scope_type)
    .bind(command.scope_id)
    .bind(payload)
    .execute(&mut **tx)
    .await
    .map_err(|_error| {
        AdminChainPolicyStoreError::system(format!(
            "failed to upsert chain policy: {}",
            "database operation failed"
        ))
    })?;
    Ok(id)
}

async fn insert_config_snapshot(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpsertChainPolicyCommand,
    target_id: i64,
    payload: serde_json::Value,
) -> Result<(), AdminChainPolicyStoreError> {
    let payload = payload.to_string();
    let snapshot_no = format!(
        "chain-policy-{target_id}-upsert-{}",
        command.config_snapshot_uuid
    );
    let id = next_claw_runtime_id("ops_config_snapshot")
        .map_err(|error| AdminChainPolicyStoreError::system(format!("{error}")))?;
    sqlx::query(
        r#"
        INSERT INTO ops_config_snapshot
            (uuid, tenant_id, organization_id, user_id, request_id, status, snapshot_no, config_scope, config_type, source_table, source_ids, config_payload, config_hash, published_at, published_by, id)
        VALUES
            ($1, $2, $3, $4, $5, 1, $6, $7, $8, 'iam_gateway_chain_policy', $9::jsonb, $10::jsonb, $11, $12::timestamptz, $13, $14)
        "#,
    )
    .bind(&command.config_snapshot_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(command.subject.operator_id)
    .bind(&command.request_id)
    .bind(snapshot_no)
    .bind(CONFIG_SCOPE_ROUTER)
    .bind(CONFIG_TYPE_CHAIN_POLICY)
    .bind(serde_json::json!([target_id]).to_string())
    .bind(&payload)
    .bind(digest_hex(&payload))
    .bind(&command.requested_at)
    .bind(command.subject.operator_id)
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|_error| {
        AdminChainPolicyStoreError::system(format!(
            "failed to write chain policy config snapshot: {}",
            "database operation failed"
        ))
    })?;
    Ok(())
}

async fn insert_audit_log(
    tx: &mut Transaction<'_, Postgres>,
    command: &UpsertChainPolicyCommand,
    target_id: i64,
    change_summary: serde_json::Value,
) -> Result<(), AdminChainPolicyStoreError> {
    let id = next_claw_runtime_id("ops_audit_log")
        .map_err(|error| AdminChainPolicyStoreError::system(format!("{error}")))?;
    sqlx::query(
        r#"
        INSERT INTO ops_audit_log
            (uuid, tenant_id, organization_id, action, target_type, target_id, request_id, operator_id, operator_type, change_summary, id)
        VALUES
            ($1, $2, $3, 'upsert_chain_policy', $4, $5, $6, $7, $8, $9::jsonb, $10)
        "#,
    )
    .bind(&command.audit_log_uuid)
    .bind(command.subject.tenant_id)
    .bind(command.subject.organization_id)
    .bind(CONFIG_TYPE_CHAIN_POLICY)
    .bind(target_id)
    .bind(&command.request_id)
    .bind(command.subject.operator_id)
    .bind(command.subject.operator_type)
    .bind(change_summary.to_string())
    .bind(id)
    .execute(&mut **tx)
    .await
    .map_err(|_error| {
        AdminChainPolicyStoreError::system(format!(
            "failed to write chain policy audit log: {}",
            "database operation failed"
        ))
    })?;
    Ok(())
}

async fn load_chain_policy_by_id(
    tx: &mut Transaction<'_, Postgres>,
    id: i64,
    tenant_id: i64,
    organization_id: i64,
) -> Result<Option<AdminChainPolicyItem>, AdminChainPolicyStoreError> {
    let row = sqlx::query(
        "SELECT id, scope_type, scope_id, COALESCE(policy_name, '') AS policy_name, payload, updated_at::text AS updated_at
         FROM iam_gateway_chain_policy
         WHERE id = $1 AND tenant_id = $2 AND organization_id = $3 AND status = 1 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(organization_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|_error| {
        AdminChainPolicyStoreError::system(format!(
            "failed to reload chain policy: {}",
            "database operation failed"
        ))
    })?;
    Ok(row.map(|row| item_from_row(&row)))
}

fn item_from_row(row: &sqlx::postgres::PgRow) -> AdminChainPolicyItem {
    AdminChainPolicyItem {
        id: row.get("id"),
        scope_type: row.get("scope_type"),
        scope_id: row.get("scope_id"),
        policy_name: row.get("policy_name"),
        payload: row.get("payload"),
        updated_at: row.get("updated_at"),
    }
}

fn digest_hex(payload: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn store_error(message: &str, error: impl std::fmt::Display) -> AdminChainPolicyStoreError {
    AdminChainPolicyStoreError::system(format!("{message}: {error}"))
}
