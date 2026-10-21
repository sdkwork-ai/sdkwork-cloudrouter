use std::time::Duration;

use sqlx::{PgPool, Row};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::runtime_id::next_cloud_runtime_id;
use crate::ports::{RuntimeInvocationReaperFuture, RuntimeInvocationReaperStore};

const SELECT_STALE_INVOCATIONS: &str = r#"
SELECT
    i.id,
    i.tenant_id,
    i.organization_id,
    i.user_id,
    i.conversation_id,
    i.chat_turn_id,
    i.agent_session_id,
    i.agent_run_id,
    i.agent_run_step_id,
    COALESCE(
        (
            SELECT MAX(event.event_no)
            FROM ai_runtime_invocation_event event
            WHERE event.tenant_id = i.tenant_id
              AND event.organization_id = i.organization_id
              AND event.user_id = i.user_id
              AND event.invocation_id = i.id
        ),
        0
    ) AS last_event_no
FROM ai_runtime_invocation i
WHERE i.status IN ('pending', 'running', 'streaming')
  AND i.started_at < CURRENT_TIMESTAMP - make_interval(secs => $1::double precision)
  AND NOT EXISTS (
      SELECT 1
      FROM ai_runtime_invocation_event terminal
      WHERE terminal.tenant_id = i.tenant_id
        AND terminal.organization_id = i.organization_id
        AND terminal.user_id = i.user_id
        AND terminal.invocation_id = i.id
        AND terminal.event_type IN ('runtime.completed', 'runtime.failed', 'runtime.cancelled')
  )
ORDER BY i.started_at ASC, i.id ASC
LIMIT $2
FOR UPDATE SKIP LOCKED
"#;

const INSERT_TERMINAL_EVENT: &str = r#"
INSERT INTO ai_runtime_invocation_event
    (id, uuid, tenant_id, organization_id, user_id, invocation_id,
     conversation_id, chat_turn_id, agent_session_id, agent_run_id,
     agent_run_step_id, event_no, event_type, event_source, payload_json,
     metadata)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'runtime.failed',
     'cloudrouter.runtime_reaper', $13::jsonb, $14::jsonb)
"#;

const MARK_INVOCATION_FAILED: &str = r#"
UPDATE ai_runtime_invocation
SET status = 'failed',
    completed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    error_type = 'runtime_reaper',
    error_code = 'runtime_invocation_abandoned',
    error_message_masked = 'runtime invocation was abandoned before a terminal event was recorded'
WHERE tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND id = $4
  AND status IN ('pending', 'running', 'streaming')
"#;

#[derive(Debug, Clone)]
pub struct PostgresRuntimeInvocationReaperStore {
    pool: PgPool,
}

impl PostgresRuntimeInvocationReaperStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl RuntimeInvocationReaperStore for PostgresRuntimeInvocationReaperStore {
    fn reap_stale<'a>(
        &'a self,
        stale_after: Duration,
        limit: i64,
    ) -> RuntimeInvocationReaperFuture<'a> {
        Box::pin(async move {
            let limit = limit.clamp(1, 1_000);
            let mut transaction = self.pool.begin().await.map_err(|error| {
                store_error("failed to begin runtime reaper transaction", error)
            })?;
            let rows = sqlx::query(SELECT_STALE_INVOCATIONS)
                .bind(stale_after.as_secs_f64())
                .bind(limit)
                .fetch_all(&mut *transaction)
                .await
                .map_err(|error| {
                    store_error("failed to select stale runtime invocations", error)
                })?;

            let payload_json = serde_json::json!({
                "errorCode": "runtime_invocation_abandoned",
                "reason": "stale_runtime_invocation",
                "staleAfterSeconds": stale_after.as_secs(),
            });
            let metadata_json = serde_json::json!({
                "reaper": "cloudrouter.runtime_reaper",
            });
            let mut repaired = 0usize;
            for row in rows {
                let tenant_id: i64 = row.get("tenant_id");
                let organization_id: i64 = row.get("organization_id");
                let user_id: i64 = row.get("user_id");
                let invocation_id: i64 = row.get("id");
                let last_event_no: i64 = row.get("last_event_no");
                let event_id = next_cloud_runtime_id("ai_runtime_invocation_event")?;
                sqlx::query(INSERT_TERMINAL_EVENT)
                    .bind(event_id)
                    .bind(sdkwork_utils_rust::uuid())
                    .bind(tenant_id)
                    .bind(organization_id)
                    .bind(user_id)
                    .bind(invocation_id)
                    .bind(row.get::<String, _>("conversation_id"))
                    .bind(row.get::<String, _>("chat_turn_id"))
                    .bind(row.get::<String, _>("agent_session_id"))
                    .bind(row.get::<Option<String>, _>("agent_run_id"))
                    .bind(row.get::<Option<String>, _>("agent_run_step_id"))
                    .bind(last_event_no.saturating_add(1))
                    .bind(payload_json.to_string())
                    .bind(metadata_json.to_string())
                    .execute(&mut *transaction)
                    .await
                    .map_err(|error| {
                        store_error("failed to insert reaped runtime terminal event", error)
                    })?;
                let updated = sqlx::query(MARK_INVOCATION_FAILED)
                    .bind(tenant_id)
                    .bind(organization_id)
                    .bind(user_id)
                    .bind(invocation_id)
                    .execute(&mut *transaction)
                    .await
                    .map_err(|error| {
                        store_error("failed to mark reaped runtime invocation failed", error)
                    })?;
                repaired += usize::try_from(updated.rows_affected()).unwrap_or(0);
            }
            transaction.commit().await.map_err(|error| {
                store_error("failed to commit runtime reaper transaction", error)
            })?;
            Ok(repaired)
        })
    }
}

fn store_error(context: &str, error: sqlx::Error) -> DomainError {
    tracing::error!(error = %error, context, "runtime invocation reaper store operation failed");
    DomainError::new(format!("{context}: database operation failed"))
}
