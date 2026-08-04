use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a container.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiContainerCreateRequest {
    /// File identifiers to attach to the container on creation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_ids: Option<Vec<String>>,

    /// Requested memory limit or container size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memory_limit: Option<String>,

    /// Developer-defined container metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable container name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
