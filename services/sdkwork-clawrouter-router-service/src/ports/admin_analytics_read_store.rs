use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type AdminAnalyticsReadFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<AdminAnalyticsSnapshot>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminAnalyticsSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AdminAnalyticsTimeRange {
    Hourly,
    Daily,
    Weekly,
    Monthly,
    Yearly,
}

impl AdminAnalyticsTimeRange {
    pub fn parse(value: Option<&str>) -> Self {
        match value
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase()
            .as_str()
        {
            "hourly" => Self::Hourly,
            "weekly" => Self::Weekly,
            "monthly" => Self::Monthly,
            "yearly" => Self::Yearly,
            _ => Self::Daily,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAnalyticsQuery {
    pub subject: AdminAnalyticsSubject,
    pub time_range: AdminAnalyticsTimeRange,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub limit: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsSnapshot {
    pub time_range: AdminAnalyticsTimeRange,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_time: Option<String>,
    pub limit: i64,
    pub summary: AdminAnalyticsSummary,
    pub trend: Vec<AdminAnalyticsTrendPoint>,
    pub user_rankings: AdminAnalyticsUserRankings,
    pub model_rankings: AdminAnalyticsModelRankings,
    pub model_distribution: Vec<AdminAnalyticsPieItem>,
    pub modality_distribution: Vec<AdminAnalyticsPieItem>,
    pub insights: Vec<AdminAnalyticsInsight>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsSummary {
    pub total_users: i64,
    pub active_users: i64,
    pub active_models: i64,
    pub total_requests: i64,
    pub successful_requests: i64,
    pub failed_requests: i64,
    pub total_tokens: f64,
    pub total_points: f64,
    pub upstream_cost: f64,
    pub average_tokens_per_request: f64,
    pub average_points_per_request: f64,
    pub error_rate: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsTrendPoint {
    pub time: String,
    pub requests: f64,
    pub tokens: f64,
    pub points: f64,
    pub users: i64,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsUserRankings {
    pub points: Vec<AdminAnalyticsUserRankItem>,
    pub tokens: Vec<AdminAnalyticsUserRankItem>,
    pub requests: Vec<AdminAnalyticsUserRankItem>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsUserRankItem {
    pub rank: i64,
    pub user_id: String,
    pub user_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    pub request_count: i64,
    pub total_tokens: f64,
    pub points: f64,
    pub model_distribution: Vec<AdminAnalyticsPieItem>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsModelRankings {
    pub points: Vec<AdminAnalyticsModelRankItem>,
    pub tokens: Vec<AdminAnalyticsModelRankItem>,
    pub requests: Vec<AdminAnalyticsModelRankItem>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsModelRankItem {
    pub rank: i64,
    pub model: String,
    pub catalog_key: String,
    pub vendor: String,
    pub modality: String,
    pub request_count: i64,
    pub total_tokens: f64,
    pub points: f64,
    pub upstream_cost: f64,
    pub user_count: i64,
    pub average_tokens_per_request: f64,
    pub error_rate: f64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsPieItem {
    pub name: String,
    pub value: f64,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsInsight {
    pub key: String,
    pub title: String,
    pub value: String,
    pub severity: String,
    pub detail: String,
}

pub trait AdminAnalyticsReadStore {
    fn load_admin_analytics<'a>(
        &'a self,
        query: AdminAnalyticsQuery,
    ) -> AdminAnalyticsReadFuture<'a>;
}
