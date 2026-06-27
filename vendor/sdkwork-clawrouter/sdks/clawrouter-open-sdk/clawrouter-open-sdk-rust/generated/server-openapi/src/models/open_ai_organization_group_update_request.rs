use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update an organization group.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationGroupUpdateRequest {
    /// Human-readable group description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Developer-defined group metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable group name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
