use serde::{Deserialize, Serialize};

use crate::models::{ArkImageGenerationData, ArkImageUsage, ArkWebSearchTool, ProviderTaskError};

/// ByteDance Ark image generation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BytedanceImageGenerationResponse {
    /// Request creation time as a Unix timestamp in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Generated image records.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<ArkImageGenerationData>>,

    /// Top-level error returned when the request produced no image at all.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ProviderTaskError>,

    /// Model id that served the request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Tools the model actually called.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ArkWebSearchTool>>,

    /// Generated image usage.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<ArkImageUsage>,
}
