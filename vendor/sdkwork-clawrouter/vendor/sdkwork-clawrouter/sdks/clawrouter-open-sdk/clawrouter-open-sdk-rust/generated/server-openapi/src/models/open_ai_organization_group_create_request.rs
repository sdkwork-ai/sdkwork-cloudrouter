use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create an organization group.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiOrganizationGroupCreateRequest {
    /// Human-readable group description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Developer-defined group metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable group name.
    pub name: String,
}
