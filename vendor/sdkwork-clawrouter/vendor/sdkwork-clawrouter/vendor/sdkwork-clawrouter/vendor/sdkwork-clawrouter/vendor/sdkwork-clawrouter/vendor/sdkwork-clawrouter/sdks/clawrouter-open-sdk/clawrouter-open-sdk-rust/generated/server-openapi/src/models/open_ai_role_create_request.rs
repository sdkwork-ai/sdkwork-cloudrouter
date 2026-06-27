use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a role.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRoleCreateRequest {
    /// Human-readable role description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Human-readable role name.
    pub name: String,

    /// Permission identifiers granted by the role.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub permissions: Option<Vec<String>>,
}
