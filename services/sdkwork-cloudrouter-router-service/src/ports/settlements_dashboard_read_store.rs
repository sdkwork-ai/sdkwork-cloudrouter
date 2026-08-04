use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type SettlementsDashboardReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<SettlementsDashboardSnapshot>> + Send + 'a>>;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SettlementsDashboardQuery {
    pub year: Option<i64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SettlementsDashboardSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SettlementsDashboardSnapshot {
    pub chart_data: Vec<SettlementChartPoint>,
    pub bills: Vec<SettlementBill>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SettlementChartPoint {
    pub day: String,
    pub text: String,
    pub image: String,
    pub video: String,
    pub audio: String,
    pub music: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SettlementBill {
    pub id: String,
    pub period: String,
    pub start_date: String,
    pub end_date: String,
    pub total_tokens: String,
    pub total_cost: String,
    pub status: String,
    pub breakdown: SettlementBillBreakdown,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SettlementBillBreakdown {
    pub text: SettlementBillBreakdownItem,
    pub image: SettlementBillBreakdownItem,
    pub video: SettlementBillBreakdownItem,
    pub audio: SettlementBillBreakdownItem,
    pub music: SettlementBillBreakdownItem,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SettlementBillBreakdownItem {
    pub cost: String,
    pub usage: String,
    pub models: Vec<String>,
}

pub trait SettlementsDashboardReadStore {
    fn load_settlements_dashboard<'a>(
        &'a self,
        query: SettlementsDashboardQuery,
        subject: Option<SettlementsDashboardSubject>,
    ) -> SettlementsDashboardReadFuture<'a>;
}
