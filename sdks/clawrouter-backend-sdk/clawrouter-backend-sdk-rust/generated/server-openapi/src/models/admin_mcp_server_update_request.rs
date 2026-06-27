use serde::{Deserialize, Serialize};

/// Admin mcp server update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerUpdateRequest {
    /// Category id field on admin mcp server update request.
    #[serde(rename = "categoryId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>,

    /// Description field on admin mcp server update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Name field on admin mcp server update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Server key field on admin mcp server update request.
    #[serde(rename = "serverKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server_key: Option<String>,

    /// Status field on admin mcp server update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Tags field on admin mcp server update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,

    /// Transport field on admin mcp server update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub transport: Option<String>,

    /// Visibility field on admin mcp server update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub visibility: Option<String>,
}
