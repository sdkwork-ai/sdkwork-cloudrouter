use std::future::Future;
use std::pin::Pin;

use serde::{Serialize, Serializer};

use crate::domain::{DecimalValue, DomainResult};

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
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "hourly" => Some(Self::Hourly),
            "daily" => Some(Self::Daily),
            "weekly" => Some(Self::Weekly),
            "monthly" => Some(Self::Monthly),
            "yearly" => Some(Self::Yearly),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminAnalyticsQuery {
    pub subject: AdminAnalyticsSubject,
    pub time_range: AdminAnalyticsTimeRange,
    pub start_time: String,
    pub end_time: String,
    pub limit: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsSnapshot {
    pub time_range: AdminAnalyticsTimeRange,
    pub start_time: String,
    pub end_time: String,
    pub limit: i64,
    pub summary: AdminAnalyticsSummary,
    pub trend: Vec<AdminAnalyticsTrendPoint>,
    pub user_rankings: AdminAnalyticsUserRankings,
    pub model_rankings: AdminAnalyticsModelRankings,
    pub model_distribution: Vec<AdminAnalyticsPieItem>,
    pub modality_distribution: Vec<AdminAnalyticsPieItem>,
    pub insights: Vec<AdminAnalyticsInsight>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsSummary {
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub total_users: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub active_users: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub active_models: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub total_requests: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub successful_requests: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub failed_requests: i64,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub total_tokens: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub total_points: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub upstream_cost: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub average_tokens_per_request: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub average_points_per_request: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub error_rate: DecimalValue,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsTrendPoint {
    pub time: String,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub requests: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub tokens: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub points: DecimalValue,
    #[serde(serialize_with = "serialize_i64_as_string")]
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
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub request_count: i64,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub total_tokens: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub points: DecimalValue,
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
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub request_count: i64,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub total_tokens: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub points: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub upstream_cost: DecimalValue,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub user_count: i64,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub average_tokens_per_request: DecimalValue,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub error_rate: DecimalValue,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdminAnalyticsPieItem {
    pub name: String,
    #[serde(serialize_with = "serialize_decimal_as_string")]
    pub value: DecimalValue,
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

fn serialize_i64_as_string<S>(value: &i64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&value.to_string())
}

fn serialize_decimal_as_string<S>(value: &DecimalValue, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&value.to_fixed_string(12))
}
