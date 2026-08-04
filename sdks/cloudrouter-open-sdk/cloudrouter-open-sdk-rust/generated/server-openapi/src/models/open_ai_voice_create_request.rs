use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a voice.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoiceCreateRequest {
    /// Human-readable voice description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Developer-defined voice metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable voice name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
