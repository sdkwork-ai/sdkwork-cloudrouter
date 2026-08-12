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
            // Deletion runs in bounded batches, one statement per batch with
            // its own commit, so an expired data volume of millions of rows
            // cannot hold one long transaction (and its row locks and WAL
            // amplification) for the whole sweep.
            const RETENTION_BATCH_SIZE: i64 = 1000;

            // Backfill the contract cleanup predicate key
            // (`retention_until <= now() AND legal_hold = false`) for rows
            // settled before this code shipped, so the retention index
            // `idx_ai_metering_usage_retention (retention_until, id)` serves
            // the sweep instead of a settled_at predicate that has no index.
            sqlx::query(
                r#"
                UPDATE ai_metering_usage
                SET retention_until = settled_at + ($3 * INTERVAL '1 day')
                WHERE retention_until IS NULL
                  AND settled_at IS NOT NULL
                  AND settled_at < now() - ($3 * INTERVAL '1 day')
                "#,
            )
            .bind(command.tenant_id)
            .bind(command.organization_id)
            .bind(command.retention_days)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("failed to backfill usage retention_until", error))?;

            let mut deleted_usage_facts: i64 = 0;
            loop {
                let usage_result = sqlx::query(
                    r#"
                    DELETE FROM ai_metering_usage
                    WHERE id IN (
                        SELECT id FROM ai_metering_usage
                        WHERE retention_until IS NOT NULL
                          AND retention_until <= now()
                          AND legal_hold = false
                          AND ($1 <= 0 OR tenant_id = $1)
                          AND ($2 <= 0 OR organization_id = $2)
                        LIMIT $4
                    )
                    "#,
                )
                .bind(command.tenant_id)
                .bind(command.organization_id)
                .bind(command.retention_days)
                .bind(RETENTION_BATCH_SIZE)
                .execute(&self.pool)
                .await
                .map_err(|error| {
                    store_error("failed to delete expired settled usage facts", error)
                })?;
                let affected = i64::try_from(usage_result.rows_affected()).unwrap_or(i64::MAX);
                deleted_usage_facts += affected;
                if affected == 0 {
                    break;
                }
            }

            let mut deleted_traces: i64 = 0;
            // Backfill the same cleanup key for legacy trace rows so the
            // trace retention index serves the sweep too.
            sqlx::query(
                r#"
                UPDATE ai_metering_request_trace
                SET retention_until = ended_at + ($3 * INTERVAL '1 day')
                WHERE retention_until IS NULL
                  AND ended_at IS NOT NULL
                  AND ended_at < now() - ($3 * INTERVAL '1 day')
                "#,
            )
            .bind(command.tenant_id)
            .bind(command.organization_id)
            .bind(command.retention_days)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("failed to backfill trace retention_until", error))?;
            loop {
                let trace_result = sqlx::query(
                    r#"
                    DELETE FROM ai_metering_request_trace t
                    WHERE t.id IN (
                        SELECT t2.id FROM ai_metering_request_trace t2
                        WHERE t2.retention_until IS NOT NULL
                          AND t2.retention_until <= now()
                          AND t2.legal_hold = false
                          AND NOT EXISTS (
                              SELECT 1 FROM ai_metering_usage u
                              WHERE u.tenant_id = t2.tenant_id
                                AND u.organization_id = t2.organization_id
                                AND u.request_id = t2.request_id
                          )
                          AND ($1 <= 0 OR t2.tenant_id = $1)
                          AND ($2 <= 0 OR t2.organization_id = $2)
                        LIMIT $4
                    )
                    "#,
                )
                .bind(command.tenant_id)
                .bind(command.organization_id)
                .bind(command.retention_days)
                .bind(RETENTION_BATCH_SIZE)
                .execute(&self.pool)
                .await
                .map_err(|error| {
                    store_error("failed to delete expired orphan request traces", error)
                })?;
                let affected = i64::try_from(trace_result.rows_affected()).unwrap_or(i64::MAX);
                deleted_traces += affected;
                if affected == 0 {
                    break;
                }
            }

            Ok(UsageRetentionOutcome {
                deleted_usage_facts,
                deleted_traces,
            })
        })
    }
}

fn store_error(context: &'static str, error: sqlx::Error) -> DomainError {
    redacted_store_error(context, error)
}
