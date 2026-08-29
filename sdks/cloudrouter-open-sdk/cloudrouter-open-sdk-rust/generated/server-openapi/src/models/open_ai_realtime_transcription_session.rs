use serde::{Deserialize, Serialize};

use crate::models::{OpenAiRealtimeClientSecretValue};

/// OpenAI-compatible realtime transcription session object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeTranscriptionSession {
    /// Client secret field on the open ai realtime transcription session, using the open ai realtime client secret value module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_secret: Option<OpenAiRealtimeClientSecretValue>,

    /// Realtime transcription session identifier.
    pub id: String,

    /// Input audio format for transcription.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_format: Option<String>,

    /// Realtime transcription configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_audio_transcription: Option<String>,

    /// Object type, normally realtime.transcription_session.
    pub object: String,
}
