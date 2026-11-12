use serde::{Deserialize, Serialize};

use crate::models::XaiImageUrl;

/// xAI Grok Imagine image edit request (EditImageRequest).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiImageEditRequest {
    /// Aspect ratio of the output image for multi-image editing; single-image edits auto-detect it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// When set, the request returns immediately with a request_id and the edit is generated in the background.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deferred: Option<bool>,

    /// Image field on the xai image edit request, using the xai image url module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<XaiImageUrl>,

    /// Input images for multi-reference editing; mutually exclusive with image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<XaiImageUrl>>,

    /// Model to be used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Number of image edits to be generated.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Optional output destination for the generated images.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<std::collections::HashMap<String, String>>,

    /// Prompt for image editing.
    pub prompt: String,

    /// Resolution of the edited image; defaults to 1k.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Response format to return the image in.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Optional output storage configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_options: Option<std::collections::HashMap<String, String>>,

    /// Unique identifier representing the end-user, for abuse monitoring.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
