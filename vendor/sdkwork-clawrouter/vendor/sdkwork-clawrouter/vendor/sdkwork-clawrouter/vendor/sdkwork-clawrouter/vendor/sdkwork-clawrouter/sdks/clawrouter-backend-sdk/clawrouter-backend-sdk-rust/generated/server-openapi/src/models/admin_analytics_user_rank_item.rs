use serde::{Deserialize, Serialize};

use crate::models::{AdminPieChartItem};

/// Admin analytics user rank item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsUserRankItem {
    /// Email field on admin analytics user rank item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,

    /// Model distribution field on admin analytics user rank item.
    #[serde(rename = "modelDistribution")]
    pub model_distribution: Vec<AdminPieChartItem>,

    /// Points field on admin analytics user rank item.
    pub points: f64,

    /// Rank field on admin analytics user rank item.
    pub rank: String,

    /// Request count field on admin analytics user rank item.
    #[serde(rename = "requestCount")]
    pub request_count: String,

    /// Total tokens field on admin analytics user rank item.
    #[serde(rename = "totalTokens")]
    pub total_tokens: f64,

    /// User id field on admin analytics user rank item.
    #[serde(rename = "userId")]
    pub user_id: String,

    /// User name field on admin analytics user rank item.
    #[serde(rename = "userName")]
    pub user_name: String,
}
