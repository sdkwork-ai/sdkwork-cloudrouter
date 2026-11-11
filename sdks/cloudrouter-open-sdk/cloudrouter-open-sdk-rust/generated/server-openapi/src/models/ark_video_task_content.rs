use serde::{Deserialize, Serialize};

/// Video output content of an Ark content generation task.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkVideoTaskContent {
    /// Last frame image URL; returned only when `return_last_frame` was true.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_frame_url: Option<String>,

    /// Generated video URL; valid for 24 hours.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
}
