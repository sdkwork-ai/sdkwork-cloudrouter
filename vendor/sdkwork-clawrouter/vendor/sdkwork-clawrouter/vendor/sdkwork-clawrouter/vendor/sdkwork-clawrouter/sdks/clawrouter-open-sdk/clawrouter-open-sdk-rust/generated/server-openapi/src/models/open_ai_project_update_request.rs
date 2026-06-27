use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to update a project.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectUpdateRequest {
    /// Developer-defined project metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable project name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
