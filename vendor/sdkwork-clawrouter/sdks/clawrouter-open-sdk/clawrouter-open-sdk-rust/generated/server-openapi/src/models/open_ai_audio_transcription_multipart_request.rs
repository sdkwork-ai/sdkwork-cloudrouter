use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai audio transcription multipart request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAudioTranscriptionMultipartRequest {
    /// File field on the open ai audio transcription multipart request, using the open ai binary file part module.
    pub file: String,

    /// Optional source language hint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,

    /// Transcription model id or Claw Router catalog key.
    pub model: String,

    /// Optional text prompt to guide transcription.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Desired transcription response format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,
}
