use chrono::{DateTime, Utc};
use serde_json::Value;
use sqlx::{PgPool, Row};

use crate::domain::{
    AsyncUsageTask, AsyncUsageTaskKind, AsyncUsageTaskStatus, DomainError, NewAsyncUsageTask,
};
use crate::infrastructure::sql::next_shared_runtime_id;
use crate::infrastructure::sql::store_error::redacted_store_error as store_error;
use crate::ports::{AsyncUsageTaskFuture, AsyncUsageTaskStore};

/// Postgres-backed reconciliation queue.
///
/// Claiming uses `FOR UPDATE SKIP LOCKED` and a lease in `next_poll_at`, so
/// multiple worker replicas can run concurrently without polling the same
/// upstream task or double-settling it.
#[derive(Debug, Clone)]
pub struct PostgresAsyncUsageTaskStore {
    pool: PgPool,
}

impl PostgresAsyncUsageTaskStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AsyncUsageTaskStore for PostgresAsyncUsageTaskStore {
    fn enqueue(&self, task: NewAsyncUsageTask) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            let id = next_shared_runtime_id("ai_metering_async_task")?;
            sqlx::query(
                r#"
                INSERT INTO ai_metering_async_task (
                    id, uuid, tenant_id, organization_id, user_id, request_id,
                    api_key_id, task_kind, upstream_id, catalog_key, supplier_code,
                    account_id, region_code, task_status, attempts, next_poll_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11,
                    $12, $13, 'pending', 0, now()
                )
                ON CONFLICT (tenant_id, organization_id, task_kind, upstream_id)
                    WHERE deleted_at IS NULL
                DO NOTHING
                "#,
            )
            .bind(id)
            .bind(format!("ast-{id}"))
            .bind(task.tenant_id)
            .bind(task.organization_id)
            .bind(task.user_id)
            .bind(task.request_id)
            .bind(task.api_key_id)
            .bind(task.task_kind.code())
            .bind(task.upstream_id)
            .bind(task.catalog_key)
            .bind(task.supplier_code)
            .bind(task.account_id)
            .bind(task.region_code)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("failed to enqueue async usage task", error))?;
            Ok(())
        })
    }

    fn claim_due(
        &self,
        now: DateTime<Utc>,
        limit: i64,
        lease: chrono::Duration,
    ) -> AsyncUsageTaskFuture<'_, Vec<AsyncUsageTask>> {
        Box::pin(async move {
            if limit <= 0 {
                return Ok(Vec::new());
            }
            let mut transaction = self
                .pool
                .begin()
                .await
                .map_err(|error| store_error("failed to begin async task claim", error))?;
            let rows = sqlx::query(
                r#"
                SELECT id
                FROM ai_metering_async_task
                WHERE task_status IN ('pending', 'running')
                  AND deleted_at IS NULL
                  AND next_poll_at <= $1
                ORDER BY next_poll_at, id
                LIMIT $2
                FOR UPDATE SKIP LOCKED
                "#,
            )
            .bind(now)
            .bind(limit)
            .fetch_all(&mut *transaction)
            .await
            .map_err(|error| store_error("failed to select due async usage tasks", error))?;
            let ids = rows
                .iter()
                .filter_map(|row| row.try_get::<i64, _>("id").ok())
                .collect::<Vec<_>>();
            if ids.is_empty() {
                transaction
                    .commit()
                    .await
                    .map_err(|error| store_error("failed to commit empty async claim", error))?;
                return Ok(Vec::new());
            }
            sqlx::query(
                r#"
                UPDATE ai_metering_async_task
                SET task_status = 'running',
                    attempts = attempts + 1,
                    next_poll_at = $2,
                    updated_at = now()
                WHERE id = ANY($1)
                "#,
            )
            .bind(&ids)
            .bind(now + lease)
            .execute(&mut *transaction)
            .await
            .map_err(|error| store_error("failed to lease async usage tasks", error))?;
            let rows = sqlx::query(
                r#"
                SELECT id, uuid, tenant_id, organization_id, user_id, api_key_id,
                       request_id, task_kind, upstream_id, catalog_key, supplier_code,
                       account_id, region_code, task_status, attempts, next_poll_at,
                       billing_request_id, usage_snapshot
                FROM ai_metering_async_task
                WHERE id = ANY($1)
                ORDER BY id
                "#,
            )
            .bind(&ids)
            .fetch_all(&mut *transaction)
            .await
            .map_err(|error| store_error("failed to read claimed async usage tasks", error))?;
            transaction
                .commit()
                .await
                .map_err(|error| store_error("failed to commit async task claim", error))?;

            rows.into_iter()
                .map(|row| {
                    let task_kind = row
                        .try_get::<String, _>("task_kind")
                        .map_err(|error| store_error("async task kind is missing", error))?;
                    let task_status = row
                        .try_get::<String, _>("task_status")
                        .map_err(|error| store_error("async task status is missing", error))?;
                    Ok(AsyncUsageTask {
                        id: row
                            .try_get("id")
                            .map_err(|error| store_error("async task id is missing", error))?,
                        uuid: row
                            .try_get("uuid")
                            .map_err(|error| store_error("async task uuid is missing", error))?,
                        tenant_id: row.try_get("tenant_id").map_err(|error| {
                            store_error("async task tenant_id is missing", error)
                        })?,
                        organization_id: row.try_get("organization_id").map_err(|error| {
                            store_error("async task organization_id is missing", error)
                        })?,
                        user_id: row
                            .try_get("user_id")
                            .map_err(|error| store_error("async task user_id is missing", error))?,
                        api_key_id: row.try_get("api_key_id").map_err(|error| {
                            store_error("async task api_key_id is missing", error)
                        })?,
                        request_id: row.try_get("request_id").map_err(|error| {
                            store_error("async task request_id is missing", error)
                        })?,
                        task_kind: AsyncUsageTaskKind::from_code(&task_kind)?,
                        upstream_id: row.try_get("upstream_id").map_err(|error| {
                            store_error("async task upstream_id is missing", error)
                        })?,
                        catalog_key: row.try_get("catalog_key").map_err(|error| {
                            store_error("async task catalog_key is missing", error)
                        })?,
                        supplier_code: row.try_get("supplier_code").map_err(|error| {
                            store_error("async task supplier_code is missing", error)
                        })?,
                        account_id: row.try_get("account_id").map_err(|error| {
                            store_error("async task account_id is missing", error)
                        })?,
                        region_code: row.try_get("region_code").map_err(|error| {
                            store_error("async task region_code is missing", error)
                        })?,
                        task_status: AsyncUsageTaskStatus::from_code(&task_status)?,
                        attempts: row.try_get("attempts").map_err(|error| {
                            store_error("async task attempts is missing", error)
                        })?,
                        next_poll_at: row.try_get("next_poll_at").map_err(|error| {
                            store_error("async task next_poll_at is missing", error)
                        })?,
                        billing_request_id: row.try_get("billing_request_id").map_err(|error| {
                            store_error("async task billing_request_id is missing", error)
                        })?,
                        usage_snapshot: row.try_get("usage_snapshot").map_err(|error| {
                            store_error("async task usage_snapshot is missing", error)
                        })?,
                    })
                })
                .collect()
        })
    }

    fn mark_settled(
        &self,
        task_id: i64,
        billing_request_id: String,
        usage_snapshot: Value,
    ) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            let affected = sqlx::query(
                r#"
                UPDATE ai_metering_async_task
                SET task_status = 'settled',
                    billing_request_id = $2,
                    usage_snapshot = $3,
                    settled_at = now(),
                    next_poll_at = now(),
                    updated_at = now()
                WHERE id = $1 AND task_status <> 'settled'
                "#,
            )
            .bind(task_id)
            .bind(billing_request_id)
            .bind(usage_snapshot)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("failed to settle async usage task", error))?;
            if affected.rows_affected() == 0 {
                return Err(DomainError::new(format!(
                    "async usage task {task_id} was already settled or does not exist"
                )));
            }
            Ok(())
        })
    }

    fn reschedule(
        &self,
        task_id: i64,
        error: String,
        next_poll_at: DateTime<Utc>,
    ) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            sqlx::query(
                r#"
                UPDATE ai_metering_async_task
                SET task_status = 'pending',
                    last_error = $2,
                    next_poll_at = $3,
                    updated_at = now()
                WHERE id = $1 AND task_status IN ('pending', 'running')
                "#,
            )
            .bind(task_id)
            .bind(error)
            .bind(next_poll_at)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("failed to reschedule async usage task", error))?;
            Ok(())
        })
    }

    fn mark_failed(&self, task_id: i64, error: String) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            sqlx::query(
                r#"
                UPDATE ai_metering_async_task
                SET task_status = 'failed', last_error = $2, updated_at = now()
                WHERE id = $1 AND task_status IN ('pending', 'running')
                "#,
            )
            .bind(task_id)
            .bind(error)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("failed to fail async usage task", error))?;
            Ok(())
        })
    }

    fn mark_expired(&self, task_id: i64, error: String) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            sqlx::query(
                r#"
                UPDATE ai_metering_async_task
                SET task_status = 'expired', last_error = $2, updated_at = now()
                WHERE id = $1 AND task_status IN ('pending', 'running')
                "#,
            )
            .bind(task_id)
            .bind(error)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("failed to expire async usage task", error))?;
            Ok(())
        })
    }
}
