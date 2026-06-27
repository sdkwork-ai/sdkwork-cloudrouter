use serde::{Deserialize, Serialize};

/// Admin prompt binding create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptBindingCreateRequest {
    /// Binding role field on admin prompt binding create request.
    #[serde(rename = "bindingRole")]
    pub binding_role: String,

    /// Enabled field on admin prompt binding create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,

    /// Owner id field on admin prompt binding create request.
    #[serde(rename = "ownerId")]
    pub owner_id: String,

    /// Owner type field on admin prompt binding create request.
    #[serde(rename = "ownerType")]
    pub owner_type: String,

    /// Policy json field on admin prompt binding create request.
    #[serde(rename = "policyJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub policy_json: Option<std::collections::HashMap<String, String>>,

    /// Priority field on admin prompt binding create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<i64>,

    /// Prompt version id field on admin prompt binding create request.
    #[serde(rename = "promptVersionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_version_id: Option<String>,
}
