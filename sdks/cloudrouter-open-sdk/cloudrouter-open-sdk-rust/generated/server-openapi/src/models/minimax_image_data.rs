use serde::{Deserialize, Serialize};

/// MiniMax generated-image envelope.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxImageData {
    /// Base64 images when `response_format` is base64.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_base64: Option<Vec<String>>,

    /// Image links when `response_format` is url.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_urls: Option<Vec<String>>,
}
