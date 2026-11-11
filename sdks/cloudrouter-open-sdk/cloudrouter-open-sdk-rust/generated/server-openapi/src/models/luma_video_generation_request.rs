use serde::{Deserialize, Serialize};

use crate::models::{LumaConcept, LumaKeyframes};

/// Luma Dream Machine video generation request (`POST /dream-machine/v1/generations/video`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LumaVideoGenerationRequest {
    /// Output aspect ratio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Callback URL notified when the generation starts, completes, or fails.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Concept references.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub concepts: Option<Vec<LumaConcept>>,

    /// Output duration: `5s`, `9s`, or a model-specific value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<String>,

    /// Generation type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generation_type: Option<String>,

    /// First and last keyframes for image-to-video or extension.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub keyframes: Option<LumaKeyframes>,

    /// Whether the generated video loops seamlessly.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#loop: Option<bool>,

    /// Luma video model.
    pub model: String,

    /// Text prompt describing the requested video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Output resolution: `540p`, `720p`, `1080p`, `4k`, or a model-specific value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,
}
