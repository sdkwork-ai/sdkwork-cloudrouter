use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to synthesize speech audio.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiSpeechCreateRequest {
    /// Text or provider-compatible input to synthesize.
    pub input: String,

    /// Developer-defined speech metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Audio model id or Claw Router catalog key.
    pub model: String,

    /// Requested audio response format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Speech speed multiplier when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub speed: Option<f64>,

    /// Voice identifier used for speech generation.
    pub voice: String,
}
