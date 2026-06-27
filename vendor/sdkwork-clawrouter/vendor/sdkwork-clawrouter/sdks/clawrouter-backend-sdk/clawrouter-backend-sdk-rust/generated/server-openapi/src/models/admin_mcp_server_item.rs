use serde::{Deserialize, Serialize};

/// Admin mcp server item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerItem {
    /// Category code field on admin mcp server item.
    #[serde(rename = "categoryCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_code: Option<String>,

    /// Category id field on admin mcp server item.
    #[serde(rename = "categoryId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>,

    /// Created at field on admin mcp server item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Deprecated at field on admin mcp server item.
    #[serde(rename = "deprecatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deprecated_at: Option<String>,

    /// Description field on admin mcp server item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Health status field on admin mcp server item.
    #[serde(rename = "healthStatus")]
    pub health_status: String,

    /// Id field on admin mcp server item.
    pub id: String,

    /// Last checked at field on admin mcp server item.
    #[serde(rename = "lastCheckedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_checked_at: Option<String>,

    /// Last error masked field on admin mcp server item.
    #[serde(rename = "lastErrorMasked")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error_masked: Option<String>,

    /// Latest revision id field on admin mcp server item.
    #[serde(rename = "latestRevisionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latest_revision_id: Option<String>,

    /// Name field on admin mcp server item.
    pub name: String,

    /// Organization id field on admin mcp server item.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Owner user id field on admin mcp server item.
    #[serde(rename = "ownerUserId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_user_id: Option<String>,

    /// Published at field on admin mcp server item.
    #[serde(rename = "publishedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,

    /// Published revision id field on admin mcp server item.
    #[serde(rename = "publishedRevisionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub published_revision_id: Option<String>,

    /// Server key field on admin mcp server item.
    #[serde(rename = "serverKey")]
    pub server_key: String,

    /// Status field on admin mcp server item.
    pub status: String,

    /// Tags field on admin mcp server item.
    pub tags: Vec<String>,

    /// Tenant id field on admin mcp server item.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Transport field on admin mcp server item.
    pub transport: String,

    /// Updated at field on admin mcp server item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,

    /// Uuid field on admin mcp server item.
    pub uuid: String,

    /// Visibility field on admin mcp server item.
    pub visibility: String,
}
