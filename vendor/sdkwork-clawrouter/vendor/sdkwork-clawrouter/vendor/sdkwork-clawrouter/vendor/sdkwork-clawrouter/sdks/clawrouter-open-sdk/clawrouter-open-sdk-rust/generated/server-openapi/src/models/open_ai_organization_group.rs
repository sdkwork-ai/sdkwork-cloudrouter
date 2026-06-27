use serde::{Deserialize, Serialize};

/// OpenAI-compatible organization group object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationGroup {
    /// Unix timestamp in seconds when the group was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Human-readable group description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Group identifier.
    pub id: String,

    /// Developer-defined group metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable group name.
    pub name: String,

    /// Object type, normally organization.group.
    pub object: String,
}
