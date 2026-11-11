use serde::{Deserialize, Serialize};

use crate::models::{OpenAiImageReferenceInput};

/// OpenAI-compatible image edit request (JSON form, `POST /v1/images/edits`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageEditRequest {
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

    /// Input image references to edit; up to 16.
    pub images: Vec<OpenAiImageReferenceInput>,

    /// How closely the model matches input style and facial features.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_fidelity: Option<String>,

    /// Markup reference: exactly one of `image_url` or `file_id`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub markup: Option<std::collections::HashMap<String, String>>,

    /// Mask reference: exactly one of `image_url` or `file_id`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mask: Option<std::collections::HashMap<String, String>>,

    /// Image edit model id or Cloud Router catalog key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

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

    /// Stable end-user identifier for safety monitoring.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_identifier: Option<String>,

    /// Requested output size, including custom `WIDTHxHEIGHT` for newer models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Stream partial image results as events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// SVG authoring selection; requires `output_format=svg`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub svg: Option<std::collections::HashMap<String, String>>,

    /// Deprecated end-user identifier; use `safety_identifier`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
