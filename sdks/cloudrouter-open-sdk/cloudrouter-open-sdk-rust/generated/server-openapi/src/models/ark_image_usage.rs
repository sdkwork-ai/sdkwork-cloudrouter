use serde::{Deserialize, Serialize};

use crate::models::{ArkVideoToolUsage};

/// Ark image generation usage.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkImageUsage {
    /// Number of successfully generated images; failed images are not billed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generated_images: Option<i64>,

    /// Number of input images sent to the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_images: Option<i64>,

    /// Output tokens billed, computed as sum(width x height) / 256.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<i64>,

    /// Tool usage for the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_usage: Option<ArkVideoToolUsage>,

    /// Total tokens for the request; input tokens are not counted, so it equals `output_tokens`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_tokens: Option<i64>,
}
