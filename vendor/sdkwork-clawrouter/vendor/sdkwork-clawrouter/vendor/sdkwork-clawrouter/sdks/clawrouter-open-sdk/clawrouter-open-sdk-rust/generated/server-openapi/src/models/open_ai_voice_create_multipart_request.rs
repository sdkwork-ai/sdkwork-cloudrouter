use serde::{Deserialize, Serialize};

/// OpenAI-compatible multipart request to create a voice.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoiceCreateMultipartRequest {
    /// Human-readable voice description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Binary voice sample or voice package.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,

    /// JSON-serialized voice metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,

    /// Human-readable voice name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}
