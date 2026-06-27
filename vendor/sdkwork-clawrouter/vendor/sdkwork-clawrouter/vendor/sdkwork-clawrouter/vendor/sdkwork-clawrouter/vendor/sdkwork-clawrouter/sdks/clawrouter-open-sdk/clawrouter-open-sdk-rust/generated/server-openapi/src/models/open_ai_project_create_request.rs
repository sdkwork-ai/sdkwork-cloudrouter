use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a project.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectCreateRequest {
    /// Developer-defined project metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable project name.
    pub name: String,
}
