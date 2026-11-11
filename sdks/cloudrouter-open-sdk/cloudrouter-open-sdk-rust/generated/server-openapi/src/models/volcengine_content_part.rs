use serde::{Deserialize, Serialize};

use crate::models::{ArkAudioSource, ArkDraftTask, ArkImageSource, ArkVideoSource};

/// One Volcengine Ark content part. `type` selects the required member: `text` requires `text`; `image_url`, `video_url`, and `audio_url` require the matching source object; `draft_task` requires `draft_task`.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VolcengineContentPart {
    /// Audio source; required when `type` is `audio_url`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<ArkAudioSource>,

    /// Draft task reference; required when `type` is `draft_task`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub draft_task: Option<ArkDraftTask>,

    /// Image source; required when `type` is `image_url`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<ArkImageSource>,

    /// Media position or purpose. Images: `first_frame` (optionally omitted for a single first frame), `last_frame` (required for first/last-frame tasks), or `reference_image`. Videos must use `reference_video`; audio must use `reference_audio`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Text prompt; required when `type` is `text`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Content part type.
    pub r#type: String,

    /// Video source; required when `type` is `video_url`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_url: Option<ArkVideoSource>,
}
