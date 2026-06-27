use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingRuleBinding, AdminModelMappingRuleItem};

/// Admin model mapping rule schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingRule {
    /// Binding type field on admin model mapping rule.
    #[serde(rename = "bindingType")]
    pub binding_type: String,

    /// Bindings field on admin model mapping rule.
    pub bindings: Vec<AdminModelMappingRuleBinding>,

    /// Created at field on admin model mapping rule.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Enabled field on admin model mapping rule.
    pub enabled: bool,

    /// Id field on admin model mapping rule.
    pub id: String,

    /// Mapping items field on admin model mapping rule.
    #[serde(rename = "mappingItems")]
    pub mapping_items: Vec<AdminModelMappingRuleItem>,

    /// Mapping mode field on admin model mapping rule.
    #[serde(rename = "mappingMode")]
    pub mapping_mode: String,

    /// Match type field on admin model mapping rule.
    #[serde(rename = "matchType")]
    pub match_type: String,

    /// Source vendor code field on admin model mapping rule.
    #[serde(rename = "sourceVendorCode")]
    pub source_vendor_code: String,

    /// Source vendor id field on admin model mapping rule.
    #[serde(rename = "sourceVendorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_vendor_id: Option<String>,

    /// Target vendor code field on admin model mapping rule.
    #[serde(rename = "targetVendorCode")]
    pub target_vendor_code: String,

    /// Target vendor id field on admin model mapping rule.
    #[serde(rename = "targetVendorId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_vendor_id: Option<String>,

    /// Updated at field on admin model mapping rule.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}
