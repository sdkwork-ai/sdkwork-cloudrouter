use serde::{Deserialize, Serialize};

/// Admin prompt binding update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptBindingUpdateRequest {
    /// Binding role field on admin prompt binding update request.
    #[serde(rename = "bindingRole")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub binding_role: Option<String>,

    /// Enabled field on admin prompt binding update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Owner id field on admin prompt binding update request.
    #[serde(rename = "ownerId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_id: Option<String>,

    /// Owner type field on admin prompt binding update request.
    #[serde(rename = "ownerType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner_type: Option<String>,

    /// Policy json field on admin prompt binding update request.
    #[serde(rename = "policyJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_json: Option<std::collections::HashMap<String, String>>,

    /// Priority field on admin prompt binding update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Prompt version id field on admin prompt binding update request.
    #[serde(rename = "promptVersionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_version_id: Option<String>,
}
