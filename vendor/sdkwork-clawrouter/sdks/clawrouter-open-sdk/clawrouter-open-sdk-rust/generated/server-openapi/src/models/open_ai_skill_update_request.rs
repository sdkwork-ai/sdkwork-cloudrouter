use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a skill.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiSkillUpdateRequest {
    /// Human-readable skill description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Developer-defined skill metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable skill name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
