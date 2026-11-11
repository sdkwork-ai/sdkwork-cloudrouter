use serde::{Deserialize, Serialize};

/// xAI Grok Imagine image generation request (GenerateImageRequest).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiImageGenerationRequest {
    /// Aspect ratio of the generated image; auto picks the best ratio for the prompt. Only supported by grok-imagine models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// When set, the request returns immediately with a request_id and the image is generated in the background; poll GET /xai/v1/images/{request_id}.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deferred: Option<bool>,

    /// Model to be used, for example grok-imagine-image-2.0.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Number of images to be generated.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<i64>,

    /// Optional output destination: each generated image is uploaded via HTTP PUT to the matching signed URL instead of xAI-hosted storage.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<std::collections::HashMap<String, String>>,

    /// Prompt for image generation.
    pub prompt: String,

    /// Resolution of the generated image; defaults to 1k and is only supported by grok-imagine models.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Response format to return the image in.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<String>,

    /// Optional output storage configuration; generated images are stored in the Files API.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_options: Option<std::collections::HashMap<String, String>>,

    /// Unique identifier representing the end-user, for abuse monitoring.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
