use serde::{Deserialize, Serialize};

/// Admin ai resource member input schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceMemberInput {
    /// Member resource code field on admin ai resource member input.
    #[serde(rename = "memberResourceCode")]
    pub member_resource_code: String,

    /// Member role field on admin ai resource member input.
    #[serde(rename = "memberRole")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub member_role: Option<String>,

    /// Required field on admin ai resource member input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,

    /// Sort order field on admin ai resource member input.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,
}
