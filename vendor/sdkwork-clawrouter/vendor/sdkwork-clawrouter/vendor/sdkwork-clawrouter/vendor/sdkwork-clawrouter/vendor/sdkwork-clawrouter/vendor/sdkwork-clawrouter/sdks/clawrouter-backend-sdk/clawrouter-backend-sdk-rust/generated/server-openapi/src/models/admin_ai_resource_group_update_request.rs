use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceGroupMemberInput};

/// Admin ai resource group update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupUpdateRequest {
    /// Description field on admin ai resource group update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Group code field on admin ai resource group update request.
    #[serde(rename = "groupCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_code: Option<String>,

    /// Group name field on admin ai resource group update request.
    #[serde(rename = "groupName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_name: Option<String>,

    /// Group type field on admin ai resource group update request.
    #[serde(rename = "groupType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_type: Option<String>,

    /// Members field on admin ai resource group update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub members: Option<Vec<AdminAiResourceGroupMemberInput>>,

    /// Selection mode field on admin ai resource group update request.
    #[serde(rename = "selectionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub selection_mode: Option<String>,

    /// Sort order field on admin ai resource group update request.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,

    /// Status field on admin ai resource group update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
