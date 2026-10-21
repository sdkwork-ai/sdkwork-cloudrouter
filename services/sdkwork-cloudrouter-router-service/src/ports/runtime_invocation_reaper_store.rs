use std::future::Future;
use std::pin::Pin;
use std::time::Duration;

use crate::domain::DomainResult;

pub type RuntimeInvocationReaperFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<usize>> + Send + 'a>>;

/// Closes runtime invocations that never reached a terminal state.
///
/// The reaper runs under the service identity and is intentionally
/// cross-tenant: a process restart is not scoped to one tenant, and every
/// statement still binds the row's own tenant/organization/user triple.
pub trait RuntimeInvocationReaperStore: Send + Sync {
    /// Marks up to `limit` invocations that started before
    /// `stale_after` ago as failed, writes their terminal event, and returns
    /// the number of repaired invocations.
    fn reap_stale(&self, stale_after: Duration, limit: i64) -> RuntimeInvocationReaperFuture<'_>;
}
