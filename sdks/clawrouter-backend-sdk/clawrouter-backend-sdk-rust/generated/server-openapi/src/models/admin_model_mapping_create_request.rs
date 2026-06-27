use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingRuleBindingInput, AdminModelMappingRuleItemInput};

/// Admin model mapping create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingCreateRequest {
    /// Bindings field on admin model mapping create request.
    pub bindings: Vec<AdminModelMappingRuleBindingInput>,

    /// Enabled field on admin model mapping create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Mapping items field on admin model mapping create request.
    #[serde(rename = "mappingItems")]
    pub mapping_items: Vec<AdminModelMappingRuleItemInput>,

    /// Mapping mode field on admin model mapping create request.
    #[serde(rename = "mappingMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mapping_mode: Option<String>,

    /// Match type field on admin model mapping create request.
    #[serde(rename = "matchType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub match_type: Option<String>,

    /// Source vendor code field on admin model mapping create request.
    #[serde(rename = "sourceVendorCode")]
    pub source_vendor_code: String,

    /// Source vendor id field on admin model mapping create request.
    #[serde(rename = "sourceVendorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_vendor_id: Option<String>,

    /// Target vendor code field on admin model mapping create request.
    #[serde(rename = "targetVendorCode")]
    pub target_vendor_code: String,

    /// Target vendor id field on admin model mapping create request.
    #[serde(rename = "targetVendorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_vendor_id: Option<String>,
}
