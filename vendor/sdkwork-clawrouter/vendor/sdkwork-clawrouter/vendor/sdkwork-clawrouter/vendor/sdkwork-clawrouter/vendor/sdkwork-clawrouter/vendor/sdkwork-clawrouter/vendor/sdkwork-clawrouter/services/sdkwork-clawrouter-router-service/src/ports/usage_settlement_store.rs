use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type UsageSettlementFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<UsageSettlementOutcome>> + Send + 'a>>;

pub trait UsageSettlementStore {
    fn settle_pending_usage<'a>(
        &'a self,
        command: UsageSettlementCommand,
    ) -> UsageSettlementFuture<'a>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UsageSettlementCommand {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub limit: i64,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UsageSettlementOutcome {
    pub settled_count: i64,
    pub failed_count: i64,
    pub debited_points: i64,
}
