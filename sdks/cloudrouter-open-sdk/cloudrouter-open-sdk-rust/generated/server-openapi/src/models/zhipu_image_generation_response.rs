use serde::{Deserialize, Serialize};

use crate::models::{ZhipuContentFilter, ZhipuImageResult};

/// Zhipu image generation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZhipuImageGenerationResponse {
    /// Content-safety verdicts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content_filter: Option<Vec<ZhipuContentFilter>>,

    /// Request creation time as a Unix timestamp in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Generated image records; the current API returns one image.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<ZhipuImageResult>>,
}
