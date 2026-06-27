use serde::{Deserialize, Serialize};

/// Admin mcp binding create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpBindingCreateRequest {
    /// Allowed tools field on admin mcp binding create request.
    #[serde(rename = "allowedTools")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub allowed_tools: Option<Vec<String>>,

    /// Denied tools field on admin mcp binding create request.
    #[serde(rename = "deniedTools")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub denied_tools: Option<Vec<String>>,

    /// Enabled field on admin mcp binding create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Owner id field on admin mcp binding create request.
    #[serde(rename = "ownerId")]
    pub owner_id: String,

    /// Owner type field on admin mcp binding create request.
    #[serde(rename = "ownerType")]
    pub owner_type: String,

    /// Policy json field on admin mcp binding create request.
    #[serde(rename = "policyJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_json: Option<std::collections::HashMap<String, String>>,

    /// Priority field on admin mcp binding create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Server revision id field on admin mcp binding create request.
    #[serde(rename = "serverRevisionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_revision_id: Option<String>,

    /// Status field on admin mcp binding create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Tool id field on admin mcp binding create request.
    #[serde(rename = "toolId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_id: Option<String>,
}
