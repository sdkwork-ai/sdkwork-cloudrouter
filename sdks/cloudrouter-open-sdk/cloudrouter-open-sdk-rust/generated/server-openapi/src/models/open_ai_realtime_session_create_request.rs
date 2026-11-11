use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a realtime session (`POST /v1/realtime/sessions`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeSessionCreateRequest {
    /// Ephemeral secret used by the session.
    pub client_secret: std::collections::HashMap<String, String>,

    /// Input audio format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_format: Option<String>,

    /// Input transcription configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_transcription: Option<std::collections::HashMap<String, String>>,

    /// Session instructions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Maximum output tokens per response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_response_output_tokens: Option<i64>,

    /// Session modalities, for example text and audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// Output audio format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_audio_format: Option<String>,

    /// Prompt template configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<std::collections::HashMap<String, String>>,

    /// Voice speed in [0.25, 1.5].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speed: Option<f64>,

    /// Sampling temperature.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    /// Tool choice mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<String>,

    /// Tools available to the session.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<std::collections::HashMap<String, String>>>,

    /// Tracing configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tracing: Option<std::collections::HashMap<String, String>>,

    /// Conversation truncation policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub truncation: Option<std::collections::HashMap<String, String>>,

    /// Voice activity detection configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub turn_detection: Option<std::collections::HashMap<String, String>>,

    /// Voice id or custom voice object.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub voice: Option<String>,
}
