use serde::{Deserialize, Serialize};

/// OpenAI-compatible audio translation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAudioTranslation {
    /// Audio duration in seconds when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Timestamped translation segments when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub segments: Option<Vec<String>>,

    /// Translated text.
    pub text: String,
}
