use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingRuleBindingInput, AdminModelMappingRuleItemInput};

/// Admin model mapping update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingUpdateRequest {
    /// Bindings field on admin model mapping update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bindings: Option<Vec<AdminModelMappingRuleBindingInput>>,

    /// Enabled field on admin model mapping update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Mapping items field on admin model mapping update request.
    #[serde(rename = "mappingItems")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mapping_items: Option<Vec<AdminModelMappingRuleItemInput>>,

    /// Mapping mode field on admin model mapping update request.
    #[serde(rename = "mappingMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mapping_mode: Option<String>,

    /// Match type field on admin model mapping update request.
    #[serde(rename = "matchType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub match_type: Option<String>,

    /// Source vendor code field on admin model mapping update request.
    #[serde(rename = "sourceVendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_vendor_code: Option<String>,

    /// Source vendor id field on admin model mapping update request.
    #[serde(rename = "sourceVendorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_vendor_id: Option<String>,

    /// Target vendor code field on admin model mapping update request.
    #[serde(rename = "targetVendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_vendor_code: Option<String>,

    /// Target vendor id field on admin model mapping update request.
    #[serde(rename = "targetVendorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_vendor_id: Option<String>,
}
