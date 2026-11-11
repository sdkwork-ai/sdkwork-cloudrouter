use serde::{Deserialize, Serialize};

/// Black Forest Labs FLUX 3 video generation request (`POST /v1/flux-3-video`). The vendor body is a discriminated union on `mode`: `t2v` requires `prompt`, `i2v` requires `prompt` and `keyframes`, `v2v` requires `prompt` and `start_video`, and `draft_enhance` requires `draft_cache`.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BlackForestLabsVideoGenerationRequest {
    /// Output aspect ratio, or `auto` to let the harness choose from the prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Generate a fast preview and return a `draft_cache` bundle.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft: Option<bool>,

    /// Encrypted draft-cache bundle from a prior `draft` generation (`draft_enhance`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft_cache: Option<String>,

    /// Video duration in whole seconds (5-20), or `auto` to fit the content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Generate synchronized audio alongside the video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generate_audio: Option<bool>,

    /// Images used as video frames for `i2v`; a single URL/base64 image, an array, or `[timestamp, image]` keyframe pairs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub keyframes: Option<String>,

    /// Generation mode; selects which other fields are required.
    pub mode: String,

    /// Free-form prompt describing the video.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Video resolution class.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Harm-moderation tolerance from 0 (strictest) to 7.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_tolerance: Option<i64>,

    /// Video to continue for `v2v`; an http(s) URL or base64 mp4.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_video: Option<String>,

    /// Opaque end-user identifier supplied by the calling platform.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,

    /// Endpoint version; `latest` (default) or a dated release.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}
