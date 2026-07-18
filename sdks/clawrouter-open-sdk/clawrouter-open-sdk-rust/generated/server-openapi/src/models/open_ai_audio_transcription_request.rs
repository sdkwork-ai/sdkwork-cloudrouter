use serde::{Deserialize, Serialize};

use crate::models::{OpenAiFileReferenceInput};

/// OpenAI-compatible open ai audio transcription request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAudioTranscriptionRequest {
    /// File field on the open ai audio transcription request, using the open ai file reference input module.
    pub file: OpenAiFileReferenceInput,

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
