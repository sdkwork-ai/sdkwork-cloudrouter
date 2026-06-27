use serde::{Deserialize, Serialize};

/// Admin mcp health check response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpHealthCheckResponse {
    /// Checked at field on admin mcp health check response.
    #[serde(rename = "checkedAt")]
    pub checked_at: String,

    /// Error masked field on admin mcp health check response.
    #[serde(rename = "errorMasked")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_masked: Option<String>,

    /// Health status field on admin mcp health check response.
    #[serde(rename = "healthStatus")]
    pub health_status: String,

    /// Healthy field on admin mcp health check response.
    pub healthy: bool,

    /// Latency ms field on admin mcp health check response.
    #[serde(rename = "latencyMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<String>,

    /// Server id field on admin mcp health check response.
    #[serde(rename = "serverId")]
    pub server_id: String,
}
