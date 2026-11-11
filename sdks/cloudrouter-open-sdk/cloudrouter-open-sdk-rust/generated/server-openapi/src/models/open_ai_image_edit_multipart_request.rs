use serde::{Deserialize, Serialize};

/// OpenAI-compatible image edit request (multipart form).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageEditMultipartRequest {
    /// Output background.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,

    /// Planning compute independently of rendering quality.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub complexity: Option<String>,

    /// Number of frames for GIF output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frame_count: Option<i64>,

    /// Delay per GIF frame in milliseconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub frame_duration_ms: Option<i64>,

    /// Image field on the open ai image edit multipart request, using the open ai binary file part module.
    pub image: Vec<u8>,

    /// Input style and facial-feature fidelity.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_fidelity: Option<String>,

    /// Markup image reference.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub markup: Option<String>,

    /// Mask field on the open ai image edit multipart request, using the open ai binary file part module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mask: Option<Vec<u8>>,

    /// Image edit model id.
    pub model: String,

    /// Content-moderation level.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub moderation: Option<String>,

    /// Number of edited images to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Compression level for `jpeg` or `webp`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_compression: Option<i64>,

    /// Returned image format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Number of partial images emitted while streaming.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub partial_images: Option<i64>,

    /// Text prompt describing the edit.
    pub prompt: String,

    /// Output quality.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,

    /// Legacy response format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Stable end-user identifier for safety monitoring.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_identifier: Option<String>,

    /// Requested output size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Stream partial image results as events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// SVG authoring selection; requires `output_format=svg`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub svg: Option<std::collections::HashMap<String, String>>,

    /// Deprecated end-user identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
