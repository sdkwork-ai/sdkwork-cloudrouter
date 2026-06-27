use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai image generation request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageGenerationRequest {
    /// Image model id or Claw Router catalog key.
    pub model: String,

    /// Number of images to generate when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Text prompt describing the image to generate.
    pub prompt: String,

    /// Requested image quality when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,

    /// Desired response format, such as url or b64_json.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Requested image size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
}
