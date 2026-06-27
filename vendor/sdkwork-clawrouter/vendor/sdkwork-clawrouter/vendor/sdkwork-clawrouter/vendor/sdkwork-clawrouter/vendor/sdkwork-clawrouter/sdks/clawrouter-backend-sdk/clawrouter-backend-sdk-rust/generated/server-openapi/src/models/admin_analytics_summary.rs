use serde::{Deserialize, Serialize};

/// Admin analytics summary schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsSummary {
    /// Active models field on admin analytics summary.
    #[serde(rename = "activeModels")]
    pub active_models: String,

    /// Active users field on admin analytics summary.
    #[serde(rename = "activeUsers")]
    pub active_users: String,

    /// Average points per request field on admin analytics summary.
    #[serde(rename = "averagePointsPerRequest")]
    pub average_points_per_request: f64,

    /// Average tokens per request field on admin analytics summary.
    #[serde(rename = "averageTokensPerRequest")]
    pub average_tokens_per_request: f64,

    /// Error rate field on admin analytics summary.
    #[serde(rename = "errorRate")]
    pub error_rate: f64,

    /// Failed requests field on admin analytics summary.
    #[serde(rename = "failedRequests")]
    pub failed_requests: String,

    /// Successful requests field on admin analytics summary.
    #[serde(rename = "successfulRequests")]
    pub successful_requests: String,

    /// Total points field on admin analytics summary.
    #[serde(rename = "totalPoints")]
    pub total_points: f64,

    /// Total requests field on admin analytics summary.
    #[serde(rename = "totalRequests")]
    pub total_requests: String,

    /// Total tokens field on admin analytics summary.
    #[serde(rename = "totalTokens")]
    pub total_tokens: f64,

    /// Total users field on admin analytics summary.
    #[serde(rename = "totalUsers")]
    pub total_users: String,

    /// Upstream cost field on admin analytics summary.
    #[serde(rename = "upstreamCost")]
    pub upstream_cost: f64,
}
