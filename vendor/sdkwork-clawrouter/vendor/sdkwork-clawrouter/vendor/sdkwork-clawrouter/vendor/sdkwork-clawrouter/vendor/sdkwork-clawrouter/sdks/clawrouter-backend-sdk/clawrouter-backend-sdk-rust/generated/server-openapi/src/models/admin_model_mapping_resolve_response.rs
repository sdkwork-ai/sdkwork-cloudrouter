use serde::{Deserialize, Serialize};

use crate::models::{AdminModelMappingRule};

/// Admin model mapping resolve response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingResolveResponse {
    /// Matched field on admin model mapping resolve response.
    pub matched: bool,

    /// Matched binding type field on admin model mapping resolve response.
    #[serde(rename = "matchedBindingType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub matched_binding_type: Option<String>,

    /// Rule field on admin model mapping resolve response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rule: Option<AdminModelMappingRule>,

    /// Source model field on admin model mapping resolve response.
    #[serde(rename = "sourceModel")]
    pub source_model: String,

    /// Target catalog key field on admin model mapping resolve response.
    #[serde(rename = "targetCatalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_catalog_key: Option<String>,

    /// Target model field on admin model mapping resolve response.
    #[serde(rename = "targetModel")]
    pub target_model: String,

    /// Target provider model field on admin model mapping resolve response.
    #[serde(rename = "targetProviderModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_provider_model: Option<String>,

    /// Target provider native model field on admin model mapping resolve response.
    #[serde(rename = "targetProviderNativeModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_provider_native_model: Option<String>,

    /// Target vendor code field on admin model mapping resolve response.
    #[serde(rename = "targetVendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_vendor_code: Option<String>,
}
