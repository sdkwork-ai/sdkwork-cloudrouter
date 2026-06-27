use serde::{Deserialize, Serialize};

use crate::models::{OpenAiImage, OpenAiTokenUsage};

/// OpenAI-compatible image generation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageList {
    /// Unix timestamp in seconds when the image output was created.
    pub created: i64,

    /// Generated, edited, or varied image outputs.
    pub data: Vec<OpenAiImage>,

    /// Usage field on the open ai image list, using the open ai token usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<OpenAiTokenUsage>,
}
