use serde::{Deserialize, Serialize};

use crate::models::{AdminAnalyticsInsight, AdminAnalyticsModelRankings, AdminAnalyticsSummary, AdminAnalyticsTrendPoint, AdminAnalyticsUserRankings, AdminPieChartItem};

/// Admin analytics overview response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsOverviewResponse {
    /// End time field on admin analytics overview response.
    #[serde(rename = "endTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_time: Option<String>,

    /// Insights field on admin analytics overview response.
    pub insights: Vec<AdminAnalyticsInsight>,

    /// Limit field on admin analytics overview response.
    pub limit: String,

    /// Modality distribution field on admin analytics overview response.
    #[serde(rename = "modalityDistribution")]
    pub modality_distribution: Vec<AdminPieChartItem>,

    /// Model distribution field on admin analytics overview response.
    #[serde(rename = "modelDistribution")]
    pub model_distribution: Vec<AdminPieChartItem>,

    /// Model rankings field on admin analytics overview response.
    #[serde(rename = "modelRankings")]
    pub model_rankings: AdminAnalyticsModelRankings,

    /// Start time field on admin analytics overview response.
    #[serde(rename = "startTime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_time: Option<String>,

    /// Summary field on admin analytics overview response.
    pub summary: AdminAnalyticsSummary,

    /// Time range field on admin analytics overview response.
    #[serde(rename = "timeRange")]
    pub time_range: String,

    /// Trend field on admin analytics overview response.
    pub trend: Vec<AdminAnalyticsTrendPoint>,

    /// User rankings field on admin analytics overview response.
    #[serde(rename = "userRankings")]
    pub user_rankings: AdminAnalyticsUserRankings,
}
