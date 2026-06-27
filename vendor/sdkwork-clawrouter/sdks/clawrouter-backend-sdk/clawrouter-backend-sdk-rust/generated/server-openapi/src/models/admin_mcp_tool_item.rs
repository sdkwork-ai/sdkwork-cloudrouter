use serde::{Deserialize, Serialize};

/// Admin mcp tool item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpToolItem {
    /// Created at field on admin mcp tool item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Description field on admin mcp tool item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Discovered at field on admin mcp tool item.
    #[serde(rename = "discoveredAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub discovered_at: Option<String>,

    /// Enabled field on admin mcp tool item.
    pub enabled: bool,

    /// Id field on admin mcp tool item.
    pub id: String,

    /// Input schema field on admin mcp tool item.
    #[serde(rename = "inputSchema")]
    pub input_schema: std::collections::HashMap<String, String>,

    /// Last invoked at field on admin mcp tool item.
    #[serde(rename = "lastInvokedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_invoked_at: Option<String>,

    /// Name field on admin mcp tool item.
    pub name: String,

    /// Organization id field on admin mcp tool item.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Output schema field on admin mcp tool item.
    #[serde(rename = "outputSchema")]
    pub output_schema: std::collections::HashMap<String, String>,

    /// Rate limit policy field on admin mcp tool item.
    #[serde(rename = "rateLimitPolicy")]
    pub rate_limit_policy: std::collections::HashMap<String, String>,

    /// Requires approval field on admin mcp tool item.
    #[serde(rename = "requiresApproval")]
    pub requires_approval: bool,

    /// Risk level field on admin mcp tool item.
    #[serde(rename = "riskLevel")]
    pub risk_level: String,

    /// Schema hash field on admin mcp tool item.
    #[serde(rename = "schemaHash")]
    pub schema_hash: String,

    /// Server id field on admin mcp tool item.
    #[serde(rename = "serverId")]
    pub server_id: String,

    /// Server revision id field on admin mcp tool item.
    #[serde(rename = "serverRevisionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_revision_id: Option<String>,

    /// Sort weight field on admin mcp tool item.
    #[serde(rename = "sortWeight")]
    pub sort_weight: i64,

    /// Status field on admin mcp tool item.
    pub status: String,

    /// Tenant id field on admin mcp tool item.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Tool key field on admin mcp tool item.
    #[serde(rename = "toolKey")]
    pub tool_key: String,

    /// Updated at field on admin mcp tool item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,

    /// Uuid field on admin mcp tool item.
    pub uuid: String,
}
