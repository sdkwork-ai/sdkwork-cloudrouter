use serde::{Deserialize, Serialize};

/// Admin mcp binding item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpBindingItem {
    /// Allowed tools field on admin mcp binding item.
    #[serde(rename = "allowedTools")]
    pub allowed_tools: Vec<String>,

    /// Created at field on admin mcp binding item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Denied tools field on admin mcp binding item.
    #[serde(rename = "deniedTools")]
    pub denied_tools: Vec<String>,

    /// Enabled field on admin mcp binding item.
    pub enabled: bool,

    /// Id field on admin mcp binding item.
    pub id: String,

    /// Organization id field on admin mcp binding item.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Owner id field on admin mcp binding item.
    #[serde(rename = "ownerId")]
    pub owner_id: String,

    /// Owner type field on admin mcp binding item.
    #[serde(rename = "ownerType")]
    pub owner_type: String,

    /// Policy json field on admin mcp binding item.
    #[serde(rename = "policyJson")]
    pub policy_json: std::collections::HashMap<String, String>,

    /// Priority field on admin mcp binding item.
    pub priority: i64,

    /// Server id field on admin mcp binding item.
    #[serde(rename = "serverId")]
    pub server_id: String,

    /// Server revision id field on admin mcp binding item.
    #[serde(rename = "serverRevisionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_revision_id: Option<String>,

    /// Snapshot json field on admin mcp binding item.
    #[serde(rename = "snapshotJson")]
    pub snapshot_json: std::collections::HashMap<String, String>,

    /// Status field on admin mcp binding item.
    pub status: String,

    /// Tenant id field on admin mcp binding item.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Tool id field on admin mcp binding item.
    #[serde(rename = "toolId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_id: Option<String>,

    /// Updated at field on admin mcp binding item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,

    /// Uuid field on admin mcp binding item.
    pub uuid: String,
}
