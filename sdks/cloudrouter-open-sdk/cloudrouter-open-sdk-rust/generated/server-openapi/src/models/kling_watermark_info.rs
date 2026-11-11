use serde::{Deserialize, Serialize};

/// Watermark configuration for a Kling generation.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingWatermarkInfo {
    /// When true the vendor also produces a watermarked result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
}
