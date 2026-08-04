use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a reusable video character.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVideoCharacterCreateRequest {
    /// Human-readable character description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Reference image URL, file id, or provider-specific image payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Developer-defined character metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable character name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
