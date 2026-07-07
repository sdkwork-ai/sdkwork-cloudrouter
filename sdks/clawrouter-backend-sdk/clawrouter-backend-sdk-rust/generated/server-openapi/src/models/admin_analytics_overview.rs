use serde::{Deserialize, Serialize};

/// Admin analytics overview schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsOverview {
    /// End time field on admin analytics overview.
    #[serde(rename = "endTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_time: Option<String>,

    /// Insights field on admin analytics overview.
    pub insights: Vec<serde_json::Value>,

    /// Modality distribution field on admin analytics overview.
    #[serde(rename = "modalityDistribution")]
    pub modality_distribution: Vec<serde_json::Value>,

    /// Model distribution field on admin analytics overview.
    #[serde(rename = "modelDistribution")]
    pub model_distribution: Vec<serde_json::Value>,

    /// Model rankings field on admin analytics overview.
    #[serde(rename = "modelRankings")]
    pub model_rankings: serde_json::Value,

    /// Ranking size field on admin analytics overview.
    #[serde(rename = "rankingSize")]
    pub ranking_size: i64,

    /// Start time field on admin analytics overview.
    #[serde(rename = "startTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_time: Option<String>,

    /// Summary field on admin analytics overview.
    pub summary: serde_json::Value,

    /// Time range field on admin analytics overview.
    #[serde(rename = "timeRange")]
    pub time_range: String,

    /// Trend field on admin analytics overview.
    pub trend: Vec<serde_json::Value>,

    /// User rankings field on admin analytics overview.
    #[serde(rename = "userRankings")]
    pub user_rankings: serde_json::Value,
}
