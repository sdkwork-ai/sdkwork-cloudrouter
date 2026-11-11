use serde::{Deserialize, Serialize};

/// Zhipu GLM-Image / CogView image generation request (`POST /api/paas/v4/images/generations`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZhipuImageGenerationRequest {
    /// Image model code.
    pub model: String,

    /// Text prompt describing the requested image.
    pub prompt: String,

    /// Output quality; `glm-image` supports only `hd`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,

    /// Output size such as `1280x1280`; allowed enum values and pixel bounds depend on the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Stable end-user identifier for abuse attribution.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,

    /// Whether the vendor adds explicit and implicit AI watermarks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark_enabled: Option<bool>,
}
