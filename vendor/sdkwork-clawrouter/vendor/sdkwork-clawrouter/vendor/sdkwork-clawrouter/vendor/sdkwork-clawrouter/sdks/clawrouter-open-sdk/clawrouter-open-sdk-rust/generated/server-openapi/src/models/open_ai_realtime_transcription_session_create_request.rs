use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a realtime transcription session.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeTranscriptionSessionCreateRequest {
    /// Input audio format for transcription.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_format: Option<String>,

    /// Realtime transcription configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_transcription: Option<String>,

    /// Developer-defined realtime metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Realtime transcription model id or Claw Router catalog key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Realtime turn detection configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub turn_detection: Option<String>,
}
