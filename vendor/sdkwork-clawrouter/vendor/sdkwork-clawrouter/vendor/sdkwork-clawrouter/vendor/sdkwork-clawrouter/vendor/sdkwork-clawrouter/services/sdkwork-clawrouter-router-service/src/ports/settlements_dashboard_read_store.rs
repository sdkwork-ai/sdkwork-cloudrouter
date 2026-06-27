use std::future::Future;
use std::pin::Pin;

pub use sdkwork_clawrouter_settlements_dashboard_repository_sqlx::{
    SettlementBill, SettlementBillBreakdown, SettlementBillBreakdownItem, SettlementChartPoint,
    SettlementsDashboardQuery, SettlementsDashboardSnapshot, SettlementsDashboardSubject,
};

use crate::domain::DomainResult;

pub type SettlementsDashboardReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<SettlementsDashboardSnapshot>> + Send + 'a>>;

pub trait SettlementsDashboardReadStore {
    fn load_settlements_dashboard<'a>(
        &'a self,
        query: SettlementsDashboardQuery,
        subject: Option<SettlementsDashboardSubject>,
    ) -> SettlementsDashboardReadFuture<'a>;
}
