use serde::{Deserialize, Serialize};

/// One generated Zhipu video.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZhipuVideoResult {
    /// Cover image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_image_url: Option<String>,

    /// Video URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
