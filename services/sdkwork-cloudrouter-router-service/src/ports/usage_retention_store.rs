use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type UsageRetentionFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<UsageRetentionOutcome>> + Send + 'a>>;

/// Command for deleting settled metering facts older than the retention
/// window. Pending/failed/terminally-failed facts are intentionally excluded:
/// settlement and reconciliation still depend on them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DeleteExpiredSettledUsageCommand {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub retention_days: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct UsageRetentionOutcome {
    pub deleted_usage_facts: i64,
    pub deleted_traces: i64,
}

pub trait UsageRetentionStore: Send + Sync {
    fn delete_expired_settled_usage<'a>(
        &'a self,
        command: DeleteExpiredSettledUsageCommand,
    ) -> UsageRetentionFuture<'a>;
}
