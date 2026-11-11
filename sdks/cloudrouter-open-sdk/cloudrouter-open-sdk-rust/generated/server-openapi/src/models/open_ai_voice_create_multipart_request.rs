use serde::{Deserialize, Serialize};

/// OpenAI-compatible multipart request to create a voice.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiVoiceCreateMultipartRequest {
    /// Binary voice sample or voice package.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<Vec<u8>>,

    /// Voice model id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Human-readable voice name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Description of the desired voice.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Optional text the voice speaks during creation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub script_hint: Option<String>,

    /// Creation mode; only `prompt` is supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
