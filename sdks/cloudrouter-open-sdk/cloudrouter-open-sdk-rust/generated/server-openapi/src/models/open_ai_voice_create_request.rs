use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a voice from a prompt.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoiceCreateRequest {
    /// Voice model id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Human-readable voice name.
    pub name: String,

    /// Description of the desired voice.
    pub prompt: String,

    /// Optional text the voice speaks during creation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub script_hint: Option<String>,

    /// Creation mode; only `prompt` is supported.
    pub r#type: String,
}
