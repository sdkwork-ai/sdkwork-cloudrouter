use serde::{Deserialize, Serialize};

/// Gemini image generation response schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GeminiImageGenerationResponse {
    /// Vendor error envelope.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<std::collections::HashMap<String, String>>,

    /// Generated image predictions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub predictions: Option<Vec<std::collections::HashMap<String, String>>>,
}
