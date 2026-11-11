use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a container.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiContainerCreateRequest {
    /// Container expiration policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_after: Option<std::collections::HashMap<String, String>>,

    /// File identifiers to attach to the container on creation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_ids: Option<Vec<String>>,

    /// Requested memory limit or container size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memory_limit: Option<String>,

    /// Human-readable container name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Container network policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub network_policy: Option<std::collections::HashMap<String, String>>,

    /// Skills to load in the container.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub skills: Option<Vec<std::collections::HashMap<String, String>>>,
}
