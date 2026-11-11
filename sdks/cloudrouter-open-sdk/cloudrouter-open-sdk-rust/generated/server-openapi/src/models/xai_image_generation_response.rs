use serde::{Deserialize, Serialize};

use crate::models::{XaiGeneratedImage, XaiUsage};

/// xAI generated-image response (GeneratedImageResponse).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiImageGenerationResponse {
    /// Generated image objects.
    pub data: Vec<XaiGeneratedImage>,

    /// Usage field on the xai image generation response, using the xai usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<XaiUsage>,
}
