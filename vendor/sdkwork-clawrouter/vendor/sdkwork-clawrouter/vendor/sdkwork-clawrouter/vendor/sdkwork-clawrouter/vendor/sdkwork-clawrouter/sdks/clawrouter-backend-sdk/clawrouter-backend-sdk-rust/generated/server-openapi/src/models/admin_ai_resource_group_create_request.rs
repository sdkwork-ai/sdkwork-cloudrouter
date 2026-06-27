use serde::{Deserialize, Serialize};

use crate::models::{AdminAiResourceGroupMemberInput};

/// Admin ai resource group create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupCreateRequest {
    /// Description field on admin ai resource group create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Group code field on admin ai resource group create request.
    #[serde(rename = "groupCode")]
    pub group_code: String,

    /// Group name field on admin ai resource group create request.
    #[serde(rename = "groupName")]
    pub group_name: String,

    /// Group type field on admin ai resource group create request.
    #[serde(rename = "groupType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_type: Option<String>,

    /// Members field on admin ai resource group create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub members: Option<Vec<AdminAiResourceGroupMemberInput>>,

    /// Selection mode field on admin ai resource group create request.
    #[serde(rename = "selectionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub selection_mode: Option<String>,

    /// Sort order field on admin ai resource group create request.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,

    /// Status field on admin ai resource group create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
