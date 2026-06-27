use serde::{Deserialize, Serialize};

/// Admin model mapping rule item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingRuleItem {
    /// Created at field on admin model mapping rule item.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Enabled field on admin model mapping rule item.
    pub enabled: bool,

    /// Id field on admin model mapping rule item.
    pub id: String,

    /// Sort order field on admin model mapping rule item.
    #[serde(rename = "sortOrder")]
    pub sort_order: String,

    /// Source catalog key field on admin model mapping rule item.
    #[serde(rename = "sourceCatalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_catalog_key: Option<String>,

    /// Source model field on admin model mapping rule item.
    #[serde(rename = "sourceModel")]
    pub source_model: String,

    /// Target catalog key field on admin model mapping rule item.
    #[serde(rename = "targetCatalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_catalog_key: Option<String>,

    /// Target model field on admin model mapping rule item.
    #[serde(rename = "targetModel")]
    pub target_model: String,

    /// Target provider model field on admin model mapping rule item.
    #[serde(rename = "targetProviderModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_provider_model: Option<String>,

    /// Target provider native model field on admin model mapping rule item.
    #[serde(rename = "targetProviderNativeModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_provider_native_model: Option<String>,

    /// Updated at field on admin model mapping rule item.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}
