use serde::{Deserialize, Serialize};

/// Admin mcp server create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerCreateRequest {
    /// Category id field on admin mcp server create request.
    #[serde(rename = "categoryId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>,

    /// Description field on admin mcp server create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Name field on admin mcp server create request.
    pub name: String,

    /// Server key field on admin mcp server create request.
    #[serde(rename = "serverKey")]
    pub server_key: String,

    /// Tags field on admin mcp server create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,

    /// Transport field on admin mcp server create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub transport: Option<String>,

    /// Visibility field on admin mcp server create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub visibility: Option<String>,
}
