use serde::{Deserialize, Serialize};

/// Admin site connection check response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteConnectionCheckResponse {
    /// Checked at field on admin site connection check response.
    #[serde(rename = "checkedAt")]
    pub checked_at: String,

    /// Health status field on admin site connection check response.
    #[serde(rename = "healthStatus")]
    pub health_status: String,

    /// Latency ms field on admin site connection check response.
    #[serde(rename = "latencyMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<String>,

    /// Message field on admin site connection check response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Site id field on admin site connection check response.
    #[serde(rename = "siteId")]
    pub site_id: String,

    /// Status field on admin site connection check response.
    pub status: String,
}
