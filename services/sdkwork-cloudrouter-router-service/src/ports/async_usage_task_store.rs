use std::future::Future;
use std::pin::Pin;

use chrono::{DateTime, Utc};
use serde_json::Value;

use crate::domain::{AsyncUsageTask, AsyncUsageTaskKind, DomainResult, NewAsyncUsageTask};

pub type AsyncUsageTaskFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

/// Durable queue for asynchronous usage reconciliation.
///
/// Enqueue is idempotent on `(tenant_id, organization_id, task_kind,
/// upstream_id)`; `claim_due` leases rows so two worker replicas never poll the
/// same task concurrently. Settlement MUST use `AsyncUsageTask::billing_request_id`
/// (upstream-id based), not the creation request id.
pub trait AsyncUsageTaskStore: Send + Sync {
    fn enqueue(&self, task: NewAsyncUsageTask) -> AsyncUsageTaskFuture<'_, ()>;

    /// Claims at most `limit` due tasks and leases them until `now + lease`.
    fn claim_due(
        &self,
        now: DateTime<Utc>,
        limit: i64,
        lease: chrono::Duration,
    ) -> AsyncUsageTaskFuture<'_, Vec<AsyncUsageTask>>;

    fn mark_settled(
        &self,
        task_id: i64,
        billing_request_id: String,
        usage_snapshot: Value,
    ) -> AsyncUsageTaskFuture<'_, ()>;

    /// Releases a claimed task for a later poll without charging it.
    fn reschedule(
        &self,
        task_id: i64,
        error: String,
        next_poll_at: DateTime<Utc>,
    ) -> AsyncUsageTaskFuture<'_, ()>;

    /// Terminal failure: the upstream task will never produce a billable result.
    fn mark_failed(&self, task_id: i64, error: String) -> AsyncUsageTaskFuture<'_, ()>;

    /// Terminal expiry for a task that exceeded its reconciliation TTL.
    fn mark_expired(&self, task_id: i64, error: String) -> AsyncUsageTaskFuture<'_, ()>;
}

/// The kind of task a route creates; exposed for registration helpers.
pub fn task_kind_for_route(route_key: &str) -> Option<AsyncUsageTaskKind> {
    match route_key {
        "openai/management/batches" => Some(AsyncUsageTaskKind::OpenAiBatch),
        "anthropic/management/batches" => Some(AsyncUsageTaskKind::AnthropicBatch),
        "openai/management/responses" => Some(AsyncUsageTaskKind::BackgroundResponse),
        "openai/management/threads" => Some(AsyncUsageTaskKind::ThreadRun),
        _ => None,
    }
}
