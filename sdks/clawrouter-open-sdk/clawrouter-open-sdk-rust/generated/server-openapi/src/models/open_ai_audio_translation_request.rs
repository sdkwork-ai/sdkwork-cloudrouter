use serde::{Deserialize, Serialize};

use crate::models::{OpenAiFileReferenceInput};

/// OpenAI-compatible open ai audio translation request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAudioTranslationRequest {
    /// File field on the open ai audio translation request, using the open ai file reference input module.
    pub file: OpenAiFileReferenceInput,

    /// Translation model id or Claw Router catalog key.
    pub model: String,

    /// Optional text prompt to guide translation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Desired translation response format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,
}
