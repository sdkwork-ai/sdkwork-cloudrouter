use serde::{Deserialize, Serialize};

/// Admin model mapping rule binding schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingRuleBinding {
    /// Binding code field on admin model mapping rule binding.
    #[serde(rename = "bindingCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding_code: Option<String>,

    /// Binding id field on admin model mapping rule binding.
    #[serde(rename = "bindingId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding_id: Option<String>,

    /// Binding name field on admin model mapping rule binding.
    #[serde(rename = "bindingName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding_name: Option<String>,

    /// Binding type field on admin model mapping rule binding.
    #[serde(rename = "bindingType")]
    pub binding_type: String,

    /// Created at field on admin model mapping rule binding.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Enabled field on admin model mapping rule binding.
    pub enabled: bool,

    /// Id field on admin model mapping rule binding.
    pub id: String,

    /// Sort order field on admin model mapping rule binding.
    #[serde(rename = "sortOrder")]
    pub sort_order: String,

    /// Updated at field on admin model mapping rule binding.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}
