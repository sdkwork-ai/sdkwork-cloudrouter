use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type GatewayBillingFuture<'a, T> = Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CustomerChargeMode {
    PrepaidAdjustment,
    Postpaid,
}

impl Default for CustomerChargeMode {
    fn default() -> Self {
        Self::PrepaidAdjustment
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GatewayBillingSettlementMode {
    Synchronous,
    Asynchronous,
}

impl Default for GatewayBillingSettlementMode {
    fn default() -> Self {
        Self::Synchronous
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayBillingAmount {
    /// Token Bank smallest-unit amount. The account service only accepts
    /// non-negative integer amounts at this boundary. `currency` remains the
    /// pricing currency for mixed-currency validation; account adapters map
    /// it to the canonical Token Bank asset currency before writing a ledger.
    pub amount: String,
    pub currency: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayBillingContext {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub request_id: String,
    pub pricing_plan_code: String,
}

pub trait GatewayBillingStore: Send + Sync {
    fn settlement_mode(&self) -> GatewayBillingSettlementMode {
        GatewayBillingSettlementMode::Synchronous
    }

    fn customer_settlement_mode<'a>(
        &'a self,
        _context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, GatewayBillingSettlementMode> {
        let mode = self.settlement_mode();
        Box::pin(async move { Ok(mode) })
    }

    fn customer_charge_mode<'a>(
        &'a self,
        context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, CustomerChargeMode>;

    fn precharge<'a>(
        &'a self,
        context: GatewayBillingContext,
        amount: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()>;

    fn settle<'a>(
        &'a self,
        context: GatewayBillingContext,
        reserved: GatewayBillingAmount,
        actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()>;

    fn charge_postpaid<'a>(
        &'a self,
        context: GatewayBillingContext,
        actual: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()>;

    fn refund<'a>(
        &'a self,
        context: GatewayBillingContext,
        reserved: GatewayBillingAmount,
    ) -> GatewayBillingFuture<'a, ()>;

    /// Marks usage facts as settled after a synchronous ledger operation has
    /// committed. Implementations must update only pending facts for the
    /// request so replaying an idempotent invocation cannot rewrite history.
    fn mark_usage_settled<'a>(
        &'a self,
        _context: GatewayBillingContext,
    ) -> GatewayBillingFuture<'a, ()> {
        Box::pin(async { Ok(()) })
    }
}
