use std::future::Future;
use std::pin::Pin;

use serde::{Serialize, Serializer};

use crate::domain::DomainResult;

pub type AdminDashboardReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<AdminDashboardSnapshot>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminDashboardSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminDashboardQuery {
    pub subject: AdminDashboardSubject,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminDashboardSnapshot {
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub active_users: i64,
    pub user_consumption: Vec<AdminPieChartItem>,
    pub multimodal: Vec<AdminPieChartItem>,
    pub traffic: Vec<AdminDashboardTrafficItem>,
    pub model_distribution: Vec<AdminPieChartItem>,
    pub recent_usage: Vec<AdminDashboardRecentUsageItem>,
}

fn serialize_i64_as_string<S>(value: &i64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&value.to_string())
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminPieChartItem {
    pub name: String,
    pub value: f64,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminDashboardTrafficItem {
    pub time: String,
    pub tokens: f64,
    pub requests: f64,
    pub cost: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminDashboardRecentUsageItem {
    pub id: String,
    pub user: String,
    pub is_api_user: bool,
    pub model: String,
    #[serde(rename = "type")]
    pub usage_type: String,
    pub billing_mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage_in: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage_out: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage_count: Option<f64>,
    pub time: String,
    pub status: String,
    pub cost: String,
}

pub trait AdminDashboardReadStore {
    fn load_dashboard<'a>(&'a self, query: AdminDashboardQuery) -> AdminDashboardReadFuture<'a>;
}
