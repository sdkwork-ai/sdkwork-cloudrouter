use serde::{Deserialize, Serialize};

/// Stability AI image generation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StabilityImageGenerationResponse {
    /// Why generation stopped, for example SUCCESS or CONTENT_FILTERED.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,

    /// Base64-encoded generated image bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Seed the provider actually used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}
