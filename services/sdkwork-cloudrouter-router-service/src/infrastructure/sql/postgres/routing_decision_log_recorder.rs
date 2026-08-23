use sha2::{Digest, Sha256};
use sqlx::{PgConnection, PgPool};

use crate::domain::DomainError;
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    RoutingDecisionLogRecorder, RoutingDecisionRecordCommand, RoutingDecisionRecordFuture,
};

const UPSERT_ROUTING_DECISION: &str = r#"
INSERT INTO ai_routing_decision_log
    (id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, payload_hash, status,
     metadata, api_key_id, requested_model, resolved_model,
     capability, selected_supplier_id, selected_account_id, selected_credential_id,
     decision_mode, decision_reason, candidate_snapshot, fallback_chain, decision_latency_ms)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, 1,
     $9::jsonb, $10, $11, $12,
     $13, $14, $15, $16,
     $17, $18::jsonb, $19::jsonb, $20::jsonb, $21)
ON CONFLICT (tenant_id, organization_id, request_id) DO UPDATE SET
    trace_id = excluded.trace_id,
    api_key_id = excluded.api_key_id,
    requested_model = excluded.requested_model,
    resolved_model = excluded.resolved_model,
    capability = excluded.capability,
    selected_supplier_id = excluded.selected_supplier_id,
    selected_account_id = excluded.selected_account_id,
    selected_credential_id = excluded.selected_credential_id,
    decision_mode = excluded.decision_mode,
    decision_reason = excluded.decision_reason,
    candidate_snapshot = excluded.candidate_snapshot,
    fallback_chain = excluded.fallback_chain,
    decision_latency_ms = excluded.decision_latency_ms,
    metadata = excluded.metadata,
    payload_hash = excluded.payload_hash
"#;

/// Persists audit-safe route decision facts into `ai_routing_decision_log`.
///
/// The writer is exactly-once per (tenant, organization, request_id) thanks to
/// the unique index; a repeated record (e.g. an interceptor error retry or a
/// replayed request) refreshes the decision columns instead of duplicating the
/// row. `id` comes from the Cloud runtime Snowflake generator and `uuid` is a
/// stable hash-derived identifier so retries never mint new identities.
#[derive(Debug, Clone)]
pub struct PostgresRoutingDecisionLogRecorder {
    pool: PgPool,
}

impl PostgresRoutingDecisionLogRecorder {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl RoutingDecisionLogRecorder for PostgresRoutingDecisionLogRecorder {
    fn record_routing_decision<'a>(
        &'a self,
        command: RoutingDecisionRecordCommand,
    ) -> RoutingDecisionRecordFuture<'a> {
        Box::pin(async move {
            command.validate()?;
            let payload_hash = Some(decision_payload_hash(&command));
            let mut connection = self.pool.acquire().await.map_err(|error| {
                redacted_store_error("failed to acquire routing decision connection", error)
            })?;
            upsert_routing_decision(&mut connection, &command, payload_hash.as_deref()).await?;
            Ok(())
        })
    }
}

async fn upsert_routing_decision(
    connection: &mut PgConnection,
    command: &RoutingDecisionRecordCommand,
    payload_hash: Option<&str>,
) -> Result<(), DomainError> {
    sqlx::query(UPSERT_ROUTING_DECISION)
        .bind(next_cloud_runtime_id("ai_routing_decision_log")?)
        .bind(decision_uuid(command))
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(command.user_id)
        .bind(&command.request_id)
        .bind(command.trace_id.as_deref())
        .bind(payload_hash)
        .bind(&command.metadata)
        .bind(command.api_key_id)
        .bind(command.requested_model.as_deref())
        .bind(command.resolved_model.as_deref())
        .bind(command.capability)
        .bind(command.selected_supplier_id)
        .bind(command.selected_account_id)
        .bind(command.selected_credential_id)
        .bind(command.decision_mode)
        .bind(serialized_json(
            "decision_reason",
            command.decision_reason.as_ref(),
        )?)
        .bind(serialized_json(
            "candidate_snapshot",
            command.candidate_snapshot.as_ref(),
        )?)
        .bind(serialized_json(
            "fallback_chain",
            command.fallback_chain.as_ref(),
        )?)
        .bind(command.decision_latency_ms)
        .execute(&mut *connection)
        .await
        .map_err(|error| redacted_store_error("failed to upsert routing decision log", error))?;
    Ok(())
}

fn serialized_json(
    field: &str,
    value: Option<&serde_json::Value>,
) -> Result<Option<String>, DomainError> {
    value
        .map(|value| {
            serde_json::to_string(value)
                .map_err(|error| DomainError::new(format!("{field} must be serializable: {error}")))
        })
        .transpose()
}

/// Stable identity derived from tenant/organization/request so an interceptor
/// error retry re-uses the same row identity instead of minting a new uuid.
/// Prefix + 58 hex chars stays within the DDL's `uuid VARCHAR(64)` ceiling.
fn decision_uuid(command: &RoutingDecisionRecordCommand) -> String {
    let mut hasher = Sha256::new();
    hasher.update(b"routing-decision-uuid:v1\0");
    hasher.update(command.tenant_id.to_string().as_bytes());
    hasher.update(command.organization_id.to_string().as_bytes());
    hasher.update(command.request_id.as_bytes());
    let digest = hex::encode(hasher.finalize());
    format!("dlog-{}", &digest[..58])
}

/// SHA-256 over the redacted decision facts so operators can detect tampering
/// or drift between the recorded snapshot and what was decided.
fn decision_payload_hash(command: &RoutingDecisionRecordCommand) -> String {
    let mut hasher = Sha256::new();
    for value in [
        command.decision_reason.as_ref(),
        command.candidate_snapshot.as_ref(),
        command.fallback_chain.as_ref(),
        Some(&command.metadata),
    ] {
        if let Some(value) = value {
            hasher.update(serde_json::to_string(value).unwrap_or_default().as_bytes());
        }
    }
    hex::encode(hasher.finalize())
}
