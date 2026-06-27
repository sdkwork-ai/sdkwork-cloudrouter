use serde::{Deserialize, Serialize};

/// Admin model mapping rule item input schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingRuleItemInput {
    /// Enabled field on admin model mapping rule item input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Id field on admin model mapping rule item input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Source catalog key field on admin model mapping rule item input.
    #[serde(rename = "sourceCatalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_catalog_key: Option<String>,

    /// Source model field on admin model mapping rule item input.
    #[serde(rename = "sourceModel")]
    pub source_model: String,

    /// Target catalog key field on admin model mapping rule item input.
    #[serde(rename = "targetCatalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_catalog_key: Option<String>,

    /// Target model field on admin model mapping rule item input.
    #[serde(rename = "targetModel")]
    pub target_model: String,

    /// Target provider model field on admin model mapping rule item input.
    #[serde(rename = "targetProviderModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_provider_model: Option<String>,

    /// Target provider native model field on admin model mapping rule item input.
    #[serde(rename = "targetProviderNativeModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_provider_native_model: Option<String>,
}
