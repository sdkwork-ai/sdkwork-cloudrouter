use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub(crate) const MAX_USAGE_SETTLEMENT_BATCH_SIZE: i64 = 200;

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

impl UsageSettlementCommand {
    pub(crate) fn bounded(mut self) -> Self {
        self.limit = sdkwork_utils_rust::clamp(self.limit, 0, MAX_USAGE_SETTLEMENT_BATCH_SIZE);
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UsageSettlementOutcome {
    pub settled_count: i64,
    pub failed_count: i64,
    pub debited_points: i64,
}

#[cfg(test)]
mod tests {
    use super::{UsageSettlementCommand, MAX_USAGE_SETTLEMENT_BATCH_SIZE};

    #[test]
    fn usage_settlement_command_clamps_untrusted_batch_limits() {
        let oversized = UsageSettlementCommand {
            tenant_id: 1,
            organization_id: 2,
            limit: i64::MAX,
            requested_at: "2026-07-14T00:00:00Z".to_owned(),
        }
        .bounded();
        assert_eq!(MAX_USAGE_SETTLEMENT_BATCH_SIZE, oversized.limit);

        let negative = UsageSettlementCommand {
            tenant_id: 1,
            organization_id: 2,
            limit: -1,
            requested_at: "2026-07-14T00:00:00Z".to_owned(),
        }
        .bounded();
        assert_eq!(0, negative.limit);
    }
}
