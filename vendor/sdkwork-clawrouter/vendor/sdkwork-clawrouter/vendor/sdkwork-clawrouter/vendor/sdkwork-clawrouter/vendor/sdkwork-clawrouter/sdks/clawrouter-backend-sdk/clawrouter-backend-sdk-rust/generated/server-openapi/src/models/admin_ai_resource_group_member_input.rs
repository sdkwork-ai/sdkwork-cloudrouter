use serde::{Deserialize, Serialize};

/// Admin ai resource group member input schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupMemberInput {
    /// Item role field on admin ai resource group member input.
    #[serde(rename = "itemRole")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub item_role: Option<String>,

    /// Resource code field on admin ai resource group member input.
    #[serde(rename = "resourceCode")]
    pub resource_code: String,

    /// Sort order field on admin ai resource group member input.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,
}
