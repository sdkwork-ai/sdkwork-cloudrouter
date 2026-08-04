use serde::{Deserialize, Serialize};

/// OpenAI-compatible audio transcription response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAudioTranscription {
    /// Audio duration in seconds when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Detected or requested language.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,

    /// Timestamped transcription segments when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub segments: Option<Vec<String>>,

    /// Transcribed text.
    pub text: String,

    /// Timestamped word records when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub words: Option<Vec<String>>,
}
