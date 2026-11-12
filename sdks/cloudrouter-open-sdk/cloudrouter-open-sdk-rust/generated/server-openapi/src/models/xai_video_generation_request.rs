use serde::{Deserialize, Serialize};

use crate::models::XaiImageUrl;

/// xAI Grok Imagine video generation request (GenerateVideoRequest). prompt is required for text-to-video and reference-to-video and optional when image supplies the first frame.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiVideoGenerationRequest {
    /// Aspect ratio of the generated video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Video duration in seconds; default 8. The vendor also accepts seconds for OpenAI API compatibility.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Image field on the xai video generation request, using the xai image url module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<XaiImageUrl>,

    /// Optional mid-video keyframe anchors, strictly between the endpoint pins.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub keyframes: Option<Vec<XaiImageUrl>>,

    /// Model to be used, for example grok-imagine-video-1.5.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Optional output destination for the generated video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<std::collections::HashMap<String, String>>,

    /// Prompt for video generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Optional reference audio clips (voice identity) for reference-to-video generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_audios: Option<Vec<String>>,

    /// Optional reference images for reference-to-video generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_images: Option<Vec<XaiImageUrl>>,

    /// Resolution of the generated video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Optional output storage configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_options: Option<std::collections::HashMap<String, String>>,

    /// Unique identifier representing the end-user.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
