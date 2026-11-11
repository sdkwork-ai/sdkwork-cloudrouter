use serde::{Deserialize, Serialize};

/// OpenAI-compatible image generation request (`POST /v1/images/generations`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageGenerationRequest {
    /// Output background.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,

    /// Planning compute independently of rendering quality.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub complexity: Option<String>,

    /// Number of frames for GIF output; only with `output_format=gif`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frame_count: Option<i64>,

    /// Delay per GIF frame in milliseconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frame_duration_ms: Option<i64>,

    /// Image model id such as gpt-image-2 or dall-e-3, or a Cloud Router catalog key.
    pub model: String,

    /// Content-moderation level.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub moderation: Option<String>,

    /// Number of images to generate in [1, 10].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Compression level for `webp` or `jpeg` output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_compression: Option<i64>,

    /// Returned image format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Number of partial images emitted while streaming.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub partial_images: Option<i64>,

    /// Text prompt describing the image to generate; at most 32000 characters.
    pub prompt: String,

    /// Output quality; `standard`/`hd` are legacy DALL-E values.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,

    /// Legacy response format for retired image models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Stable end-user identifier for safety monitoring.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_identifier: Option<String>,

    /// Requested image size, for example `auto`, `1024x1024`, or `1536x1024`; custom `WIDTHxHEIGHT` is supported by newer models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Stream partial image results as events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Legacy style for retired image models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub style: Option<String>,

    /// SVG authoring selection; requires `output_format=svg`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub svg: Option<std::collections::HashMap<String, String>>,

    /// Deprecated end-user identifier; use `safety_identifier`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
