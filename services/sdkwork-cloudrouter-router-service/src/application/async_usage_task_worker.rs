use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use chrono::{DateTime, Duration, Utc};
use serde_json::Value;

use crate::domain::{AsyncUsageTask, DomainResult};
use crate::ports::AsyncUsageTaskStore;

/// Result of one upstream poll for a claimed task.
#[derive(Debug, Clone, PartialEq)]
pub enum AsyncUsagePoll {
    /// The task is still running; retry later.
    Pending,
    /// The task completed and the upstream reported usage.
    Completed {
        usage_snapshot: Value,
        billing_request_id: String,
    },
    /// The task reached a terminal failure; never charge it.
    Failed(String),
}

pub type AsyncUsagePollFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<AsyncUsagePoll>> + Send + 'a>>;

/// Provider-specific poller. The worker owns leasing/state transitions; the
/// executor only talks to one provider and returns the reported usage.
pub trait AsyncUsageTaskExecutor: Send + Sync {
    fn poll(&self, task: &AsyncUsageTask) -> AsyncUsagePollFuture<'_>;
}

/// Claim → poll → settle/reschedule/expire loop.
pub struct AsyncUsageTaskWorker {
    store: Arc<dyn AsyncUsageTaskStore>,
    executor: Arc<dyn AsyncUsageTaskExecutor>,
    lease: Duration,
    retry_delay: Duration,
    max_attempts: i32,
}

impl AsyncUsageTaskWorker {
    pub fn new(
        store: Arc<dyn AsyncUsageTaskStore>,
        executor: Arc<dyn AsyncUsageTaskExecutor>,
        lease: Duration,
        retry_delay: Duration,
        max_attempts: i32,
    ) -> Self {
        Self {
            store,
            executor,
            lease,
            retry_delay,
            max_attempts: max_attempts.max(1),
        }
    }

    /// Runs one bounded claim/poll pass and returns the number of claimed rows.
    pub async fn run_once(&self, now: DateTime<Utc>, limit: i64) -> DomainResult<usize> {
        let tasks = self.store.claim_due(now, limit, self.lease).await?;
        for task in &tasks {
            if task.attempts >= self.max_attempts {
                self.store
                    .mark_expired(
                        task.id,
                        format!(
                            "async usage task exceeded {} reconciliation attempts",
                            self.max_attempts
                        ),
                    )
                    .await?;
                continue;
            }
            match self.executor.poll(task).await? {
                AsyncUsagePoll::Completed {
                    usage_snapshot,
                    billing_request_id,
                } => {
                    self.store
                        .mark_settled(task.id, billing_request_id, usage_snapshot)
                        .await?;
                }
                AsyncUsagePoll::Pending => {
                    self.store
                        .reschedule(task.id, "upstream task still running".to_owned(), now + self.retry_delay)
                        .await?;
                }
                AsyncUsagePoll::Failed(error) => {
                    self.store.mark_failed(task.id, error).await?;
                }
            }
        }
        Ok(tasks.len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{AsyncUsageTaskKind, NewAsyncUsageTask};
    use crate::infrastructure::InMemoryAsyncUsageTaskStore;
    use std::sync::Mutex;

    struct FixedExecutor {
        result: Mutex<AsyncUsagePoll>,
    }

    impl FixedExecutor {
        fn new(result: AsyncUsagePoll) -> Self {
            Self {
                result: Mutex::new(result),
            }
        }
    }

    impl AsyncUsageTaskExecutor for FixedExecutor {
        fn poll(&self, _task: &AsyncUsageTask) -> AsyncUsagePollFuture<'_> {
            Box::pin(async move { Ok(self.result.lock().unwrap().clone()) })
        }
    }

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
        }
    }

    fn worker(
        store: Arc<InMemoryAsyncUsageTaskStore>,
        poll: AsyncUsagePoll,
    ) -> AsyncUsageTaskWorker {
        AsyncUsageTaskWorker::new(
            store,
            Arc::new(FixedExecutor::new(poll)),
            Duration::seconds(30),
            Duration::seconds(5),
            3,
        )
    }

    #[tokio::test]
    async fn completed_poll_settles_the_task() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        store.enqueue(task("batch-1")).await.unwrap();
        let worker = worker(
            Arc::clone(&store),
            AsyncUsagePoll::Completed {
                usage_snapshot: serde_json::json!({"usage": {"input_tokens": 10}}),
                billing_request_id: "async:openai_batch:batch-1".to_owned(),
            },
        );
        let now = Utc::now() + Duration::seconds(1);
        assert_eq!(1, worker.run_once(now, 10).await.unwrap());

        let claimed = store
            .claim_due(now + Duration::seconds(60), 10, Duration::seconds(30))
            .await
            .unwrap();
        assert!(claimed.is_empty(), "settled rows are terminal");
    }

    #[tokio::test]
    async fn pending_poll_reschedules_without_charging() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        store.enqueue(task("batch-1")).await.unwrap();
        let worker = worker(Arc::clone(&store), AsyncUsagePoll::Pending);
        let now = Utc::now() + Duration::seconds(1);
        worker.run_once(now, 10).await.unwrap();

        let not_due = store
            .claim_due(now, 10, Duration::seconds(30))
            .await
            .unwrap();
        assert!(not_due.is_empty(), "retry delay must hold the row");
        let due = store
            .claim_due(now + Duration::seconds(10), 10, Duration::seconds(30))
            .await
            .unwrap();
        assert_eq!(1, due.len());
        assert_eq!(2, due[0].attempts, "the second claim increments again");
    }

    #[tokio::test]
    async fn failed_poll_is_terminal() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        store.enqueue(task("batch-1")).await.unwrap();
        let worker = worker(
            Arc::clone(&store),
            AsyncUsagePoll::Failed("upstream batch failed".to_owned()),
        );
        let now = Utc::now() + Duration::seconds(1);
        worker.run_once(now, 10).await.unwrap();

        let claimed = store
            .claim_due(now + Duration::seconds(60), 10, Duration::seconds(30))
            .await
            .unwrap();
        assert!(claimed.is_empty(), "failed rows are terminal");
    }
}
