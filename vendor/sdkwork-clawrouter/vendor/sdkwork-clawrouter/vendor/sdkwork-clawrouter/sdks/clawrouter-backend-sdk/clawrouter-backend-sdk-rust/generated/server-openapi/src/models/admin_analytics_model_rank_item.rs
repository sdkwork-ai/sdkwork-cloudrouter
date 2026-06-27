use serde::{Deserialize, Serialize};

/// Admin analytics model rank item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAnalyticsModelRankItem {
    /// Average tokens per request field on admin analytics model rank item.
    #[serde(rename = "averageTokensPerRequest")]
    pub average_tokens_per_request: f64,

    /// Catalog key field on admin analytics model rank item.
    #[serde(rename = "catalogKey")]
    pub catalog_key: String,

    /// Error rate field on admin analytics model rank item.
    #[serde(rename = "errorRate")]
    pub error_rate: f64,

    /// Modality field on admin analytics model rank item.
    pub modality: String,

    /// Model field on admin analytics model rank item.
    pub model: String,

    /// Points field on admin analytics model rank item.
    pub points: f64,

    /// Rank field on admin analytics model rank item.
    pub rank: String,

    /// Request count field on admin analytics model rank item.
    #[serde(rename = "requestCount")]
    pub request_count: String,

    /// Total tokens field on admin analytics model rank item.
    #[serde(rename = "totalTokens")]
    pub total_tokens: f64,

    /// Upstream cost field on admin analytics model rank item.
    #[serde(rename = "upstreamCost")]
    pub upstream_cost: f64,

    /// User count field on admin analytics model rank item.
    #[serde(rename = "userCount")]
    pub user_count: String,

    /// Vendor field on admin analytics model rank item.
    pub vendor: String,
}
