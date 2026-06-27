use serde::{Deserialize, Serialize};

/// Admin prompt item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptItem {
    /// Category code field on admin prompt item.
    #[serde(rename = "categoryCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_code: Option<String>,

    /// Category id field on admin prompt item.
    #[serde(rename = "categoryId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_id: Option<String>,

    /// Created at field on admin prompt item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Description field on admin prompt item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Id field on admin prompt item.
    pub id: String,

    /// Latest version id field on admin prompt item.
    #[serde(rename = "latestVersionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latest_version_id: Option<String>,

    /// Name field on admin prompt item.
    pub name: String,

    /// Organization id field on admin prompt item.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Owner user id field on admin prompt item.
    #[serde(rename = "ownerUserId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_user_id: Option<String>,

    /// Prompt key field on admin prompt item.
    #[serde(rename = "promptKey")]
    pub prompt_key: String,

    /// Prompt type field on admin prompt item.
    #[serde(rename = "promptType")]
    pub prompt_type: String,

    /// Published version id field on admin prompt item.
    #[serde(rename = "publishedVersionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub published_version_id: Option<String>,

    /// Status field on admin prompt item.
    pub status: String,

    /// Tags field on admin prompt item.
    pub tags: Vec<String>,

    /// Tenant id field on admin prompt item.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Updated at field on admin prompt item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,

    /// Uuid field on admin prompt item.
    pub uuid: String,

    /// Visibility field on admin prompt item.
    pub visibility: String,
}
