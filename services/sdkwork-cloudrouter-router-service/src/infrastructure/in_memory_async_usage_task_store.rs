use std::collections::HashMap;
use std::sync::Mutex;

use chrono::{DateTime, Utc};
use serde_json::Value;

use crate::domain::{
    AsyncUsageTask, AsyncUsageTaskStatus, DomainError, DomainResult, NewAsyncUsageTask,
};
use crate::ports::{AsyncUsageTaskFuture, AsyncUsageTaskStore};

#[derive(Debug, Default)]
struct Inner {
    tasks: HashMap<i64, AsyncUsageTask>,
    next_id: i64,
}

/// In-memory queue used by unit tests and single-process development hosts.
/// Production uses `PostgresAsyncUsageTaskStore`.
#[derive(Debug, Default)]
pub struct InMemoryAsyncUsageTaskStore {
    inner: Mutex<Inner>,
}

impl InMemoryAsyncUsageTaskStore {
    pub fn new() -> Self {
        Self::default()
    }

    fn lock(&self) -> DomainResult<std::sync::MutexGuard<'_, Inner>> {
        self.inner
            .lock()
            .map_err(|_| DomainError::new("async usage task store lock poisoned"))
    }
}

impl AsyncUsageTaskStore for InMemoryAsyncUsageTaskStore {
    fn enqueue(&self, task: NewAsyncUsageTask) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            let mut inner = self.lock()?;
            let duplicate = inner.tasks.values().any(|existing| {
                existing.tenant_id == task.tenant_id
                    && existing.organization_id == task.organization_id
                    && existing.task_kind == task.task_kind
                    && existing.upstream_id == task.upstream_id
            });
            if duplicate {
                return Ok(());
            }
            inner.next_id += 1;
            let id = inner.next_id;
            inner.tasks.insert(
                id,
                AsyncUsageTask {
                    id,
                    uuid: format!("async-task-{id}"),
                    tenant_id: task.tenant_id,
                    organization_id: task.organization_id,
                    user_id: task.user_id,
                    api_key_id: task.api_key_id,
                    request_id: task.request_id,
                    task_kind: task.task_kind,
                    upstream_id: task.upstream_id,
                    catalog_key: task.catalog_key,
                    supplier_code: task.supplier_code,
                    account_id: task.account_id,
                    region_code: task.region_code,
                    task_status: AsyncUsageTaskStatus::Pending,
                    attempts: 0,
                    next_poll_at: Utc::now(),
                    billing_request_id: None,
                    usage_snapshot: None,
                    metadata: task.metadata,
                },
            );
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
            let mut inner = self.lock()?;
            let mut due = inner
                .tasks
                .values()
                .filter(|task| {
                    matches!(
                        task.task_status,
                        AsyncUsageTaskStatus::Pending | AsyncUsageTaskStatus::Running
                    ) && task.next_poll_at <= now
                })
                .map(|task| (task.next_poll_at, task.id))
                .collect::<Vec<_>>();
            due.sort();
            due.truncate(limit as usize);

            let mut claimed = Vec::with_capacity(due.len());
            for (_, id) in due {
                if let Some(task) = inner.tasks.get_mut(&id) {
                    task.task_status = AsyncUsageTaskStatus::Running;
                    task.attempts = task.attempts.saturating_add(1);
                    task.next_poll_at = now + lease;
                    claimed.push(task.clone());
                }
            }
            Ok(claimed)
        })
    }

    fn mark_settled(
        &self,
        task_id: i64,
        billing_request_id: String,
        usage_snapshot: Value,
    ) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            let mut inner = self.lock()?;
            let task = inner
                .tasks
                .get_mut(&task_id)
                .ok_or_else(|| DomainError::new(format!("async usage task {task_id} not found")))?;
            task.task_status = AsyncUsageTaskStatus::Settled;
            task.billing_request_id = Some(billing_request_id);
            task.usage_snapshot = Some(usage_snapshot);
            task.next_poll_at = Utc::now();
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
            let mut inner = self.lock()?;
            let task = inner
                .tasks
                .get_mut(&task_id)
                .ok_or_else(|| DomainError::new(format!("async usage task {task_id} not found")))?;
            task.task_status = AsyncUsageTaskStatus::Pending;
            task.next_poll_at = next_poll_at;
            task.usage_snapshot = Some(serde_json::json!({ "lastError": error }));
            Ok(())
        })
    }

    fn mark_failed(&self, task_id: i64, error: String) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            let mut inner = self.lock()?;
            let task = inner
                .tasks
                .get_mut(&task_id)
                .ok_or_else(|| DomainError::new(format!("async usage task {task_id} not found")))?;
            task.task_status = AsyncUsageTaskStatus::Failed;
            task.usage_snapshot = Some(serde_json::json!({ "lastError": error }));
            Ok(())
        })
    }

    fn mark_expired(&self, task_id: i64, error: String) -> AsyncUsageTaskFuture<'_, ()> {
        Box::pin(async move {
            let mut inner = self.lock()?;
            let task = inner
                .tasks
                .get_mut(&task_id)
                .ok_or_else(|| DomainError::new(format!("async usage task {task_id} not found")))?;
            task.task_status = AsyncUsageTaskStatus::Expired;
            task.usage_snapshot = Some(serde_json::json!({ "lastError": error }));
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::AsyncUsageTaskKind;

    fn task(upstream_id: &str) -> NewAsyncUsageTask {
        NewAsyncUsageTask {
            tenant_id: 10,
            organization_id: 20,
            user_id: Some(30),
            api_key_id: 100,
            request_id: format!("req-{upstream_id}"),
            task_kind: AsyncUsageTaskKind::OpenAiBatch,
            upstream_id: upstream_id.to_owned(),
            catalog_key: Some("openai/gpt-5.6-sol".to_owned()),
            supplier_code: "openai".to_owned(),
            account_id: 3001,
            region_code: "global".to_owned(),
            metadata: None,
        }
    }

    #[tokio::test]
    async fn enqueue_is_idempotent_on_the_upstream_identity() {
        let store = InMemoryAsyncUsageTaskStore::new();
        store.enqueue(task("batch-1")).await.unwrap();
        store.enqueue(task("batch-1")).await.unwrap();

        let claimed = store
            .claim_due(
                Utc::now() + chrono::Duration::seconds(1),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .unwrap();
        assert_eq!(1, claimed.len());
        assert_eq!("batch-1", claimed[0].upstream_id);
    }

    #[tokio::test]
    async fn claim_leases_due_rows_and_advances_attempts() {
        let store = InMemoryAsyncUsageTaskStore::new();
        store.enqueue(task("batch-1")).await.unwrap();
        store.enqueue(task("batch-2")).await.unwrap();

        let claimed = store
            .claim_due(
                Utc::now() + chrono::Duration::seconds(1),
                1,
                chrono::Duration::seconds(30),
            )
            .await
            .unwrap();
        assert_eq!(1, claimed.len());
        assert_eq!(1, claimed[0].attempts);

        let second = store
            .claim_due(
                Utc::now() + chrono::Duration::seconds(1),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .unwrap();
        assert_eq!(1, second.len());
        assert_ne!(claimed[0].id, second[0].id);
        assert_eq!(1, second[0].attempts);

        store
            .mark_settled(
                claimed[0].id,
                claimed[0].billing_request_id(),
                serde_json::json!({"usage": {"input_tokens": 10}}),
            )
            .await
            .unwrap();
        store
            .mark_settled(
                second[0].id,
                second[0].billing_request_id(),
                serde_json::json!({"usage": {"input_tokens": 20}}),
            )
            .await
            .unwrap();
        let after = store
            .claim_due(
                Utc::now() + chrono::Duration::seconds(120),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .unwrap();
        assert!(after.is_empty(), "settled rows are terminal");
    }
}
