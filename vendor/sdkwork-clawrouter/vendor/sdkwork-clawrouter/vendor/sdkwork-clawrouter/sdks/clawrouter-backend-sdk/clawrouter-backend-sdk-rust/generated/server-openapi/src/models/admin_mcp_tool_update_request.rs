use serde::{Deserialize, Serialize};

/// Admin mcp tool update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpToolUpdateRequest {
    /// Description field on admin mcp tool update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Enabled field on admin mcp tool update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Input schema field on admin mcp tool update request.
    #[serde(rename = "inputSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_schema: Option<std::collections::HashMap<String, String>>,

    /// Name field on admin mcp tool update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Output schema field on admin mcp tool update request.
    #[serde(rename = "outputSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_schema: Option<std::collections::HashMap<String, String>>,

    /// Rate limit policy field on admin mcp tool update request.
    #[serde(rename = "rateLimitPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rate_limit_policy: Option<std::collections::HashMap<String, String>>,

    /// Requires approval field on admin mcp tool update request.
    #[serde(rename = "requiresApproval")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub requires_approval: Option<bool>,

    /// Risk level field on admin mcp tool update request.
    #[serde(rename = "riskLevel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub risk_level: Option<String>,

    /// Sort weight field on admin mcp tool update request.
    #[serde(rename = "sortWeight")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_weight: Option<i64>,

    /// Status field on admin mcp tool update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
