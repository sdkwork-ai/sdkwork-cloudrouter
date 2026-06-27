use serde::{Deserialize, Serialize};

/// Admin ai resource member item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceMemberItem {
    /// Member resource code field on admin ai resource member item.
    #[serde(rename = "memberResourceCode")]
    pub member_resource_code: String,

    /// Member role field on admin ai resource member item.
    #[serde(rename = "memberRole")]
    pub member_role: String,

    /// Parent resource code field on admin ai resource member item.
    #[serde(rename = "parentResourceCode")]
    pub parent_resource_code: String,

    /// Required field on admin ai resource member item.
    pub required: bool,

    /// Sort order field on admin ai resource member item.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,
}
