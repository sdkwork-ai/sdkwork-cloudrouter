use serde::{Deserialize, Serialize};

/// OpenAI-compatible voice object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoice {
    /// Unix timestamp in seconds when the voice was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Human-readable voice description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Voice identifier.
    pub id: String,

    /// Developer-defined voice metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable voice name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Object type, normally voice.
    pub object: String,

    /// Voice lifecycle status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
