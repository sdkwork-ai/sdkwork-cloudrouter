use serde::{Deserialize, Serialize};

/// Admin model mapping rule binding input schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingRuleBindingInput {
    /// Binding code field on admin model mapping rule binding input.
    #[serde(rename = "bindingCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding_code: Option<String>,

    /// Binding id field on admin model mapping rule binding input.
    #[serde(rename = "bindingId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding_id: Option<String>,

    /// Binding name field on admin model mapping rule binding input.
    #[serde(rename = "bindingName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding_name: Option<String>,

    /// Binding type field on admin model mapping rule binding input.
    #[serde(rename = "bindingType")]
    pub binding_type: String,

    /// Enabled field on admin model mapping rule binding input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Id field on admin model mapping rule binding input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
}
