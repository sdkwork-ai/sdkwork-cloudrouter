use serde::{Deserialize, Serialize};

/// Admin ai resource group item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminAiResourceGroupItem {
    /// Capabilities field on admin ai resource group item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<Vec<String>>,

    /// Capability field on admin ai resource group item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capability: Option<String>,

    /// Description field on admin ai resource group item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Dynamic field on admin ai resource group item.
    pub dynamic: bool,

    /// Group code field on admin ai resource group item.
    #[serde(rename = "groupCode")]
    pub group_code: String,

    /// Group name field on admin ai resource group item.
    #[serde(rename = "groupName")]
    pub group_name: String,

    /// Group type field on admin ai resource group item.
    #[serde(rename = "groupType")]
    pub group_type: String,

    /// Id field on admin ai resource group item.
    pub id: String,

    /// Resource count field on admin ai resource group item.
    #[serde(rename = "resourceCount")]
    pub resource_count: String,

    /// Selection mode field on admin ai resource group item.
    #[serde(rename = "selectionMode")]
    pub selection_mode: String,

    /// Sort order field on admin ai resource group item.
    #[serde(rename = "sortOrder")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,

    /// Status field on admin ai resource group item.
    pub status: String,

    /// Vendor codes field on admin ai resource group item.
    #[serde(rename = "vendorCodes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_codes: Option<Vec<String>>,
}
