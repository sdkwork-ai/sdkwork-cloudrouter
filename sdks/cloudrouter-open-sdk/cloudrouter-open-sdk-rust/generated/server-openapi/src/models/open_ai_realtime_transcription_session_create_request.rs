use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a realtime transcription session (`POST /v1/realtime/transcription_sessions`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeTranscriptionSessionCreateRequest {
    /// Additional event types to include.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include: Option<Vec<String>>,

    /// Input audio format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_format: Option<String>,

    /// Input noise-reduction configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_noise_reduction: Option<std::collections::HashMap<String, String>>,

    /// Transcription configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_transcription: Option<std::collections::HashMap<String, String>>,

    /// Voice activity detection configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub turn_detection: Option<std::collections::HashMap<String, String>>,
}
