use sqlx::PgPool;

use crate::domain::DomainError;
use crate::infrastructure::sql::store_error::redacted_store_error;
use crate::ports::{
    DeleteExpiredSettledUsageCommand, UsageRetentionFuture, UsageRetentionOutcome,
    UsageRetentionStore,
};

/// Postgres retention implementation.
///
/// Deletion order matters: settled usage facts are removed first, then request
/// traces that no longer reference any remaining usage fact. Facts that are
/// still pending, failed, or terminally failed are never deleted.
#[derive(Debug, Clone)]
pub struct PostgresUsageRetentionStore {
    pool: PgPool,
}

impl PostgresUsageRetentionStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl UsageRetentionStore for PostgresUsageRetentionStore {
    fn delete_expired_settled_usage<'a>(
        &'a self,
        command: DeleteExpiredSettledUsageCommand,
    ) -> UsageRetentionFuture<'a> {
        Box::pin(async move {
            let mut tx = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin usage retention transaction", error))?;

            let usage_result = sqlx::query(
                r#"
                DELETE FROM ai_metering_usage
                WHERE settlement_status = 2
                  AND settled_at IS NOT NULL
                  AND settled_at < now() - ($3 * INTERVAL '1 day')
                  AND ($1 <= 0 OR tenant_id = $1)
                  AND ($2 <= 0 OR organization_id = $2)
                "#,
            )
            .bind(command.tenant_id)
            .bind(command.organization_id)
            .bind(command.retention_days)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("failed to delete expired settled usage facts", error))?;

            let trace_result = sqlx::query(
                r#"
                DELETE FROM ai_metering_request_trace t
                WHERE t.ended_at IS NOT NULL
                  AND t.ended_at < now() - ($3 * INTERVAL '1 day')
                  AND NOT EXISTS (
                      SELECT 1 FROM ai_metering_usage u
                      WHERE u.tenant_id = t.tenant_id
                        AND u.organization_id = t.organization_id
                        AND u.request_id = t.request_id
                  )
                  AND ($1 <= 0 OR t.tenant_id = $1)
                  AND ($2 <= 0 OR t.organization_id = $2)
                "#,
            )
            .bind(command.tenant_id)
            .bind(command.organization_id)
            .bind(command.retention_days)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("failed to delete expired orphan request traces", error))?;

            tx.commit()
                .await
                .map_err(|error| store_error("failed to commit usage retention transaction", error))?;

            Ok(UsageRetentionOutcome {
                deleted_usage_facts: i64::try_from(usage_result.rows_affected())
                    .unwrap_or(i64::MAX),
                deleted_traces: i64::try_from(trace_result.rows_affected()).unwrap_or(i64::MAX),
            })
        })
    }
}

fn store_error(context: &'static str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
