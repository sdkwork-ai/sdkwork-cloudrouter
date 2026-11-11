use serde::{Deserialize, Serialize};

use crate::models::{ProviderTaskError};

/// One generated image record returned by Ark.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkImageGenerationData {
    /// Base64 image data, returned when `response_format` is `b64_json`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub b64_json: Option<String>,

    /// Layer bounding box in layer-decomposition mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bounding_box: Option<std::collections::HashMap<String, String>>,

    /// Layer description in layer-decomposition mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Per-image failure details in grouped-image mode; other images are unaffected.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ProviderTaskError>,

    /// Layer name in layer-decomposition mode.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Actual output image format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,

    /// Image size as `<width>x<height>` in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,

    /// Download URL, returned when `response_format` is `url`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Layer stacking index in layer-decomposition mode; the base image is 0.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub z_index: Option<i64>,
}
