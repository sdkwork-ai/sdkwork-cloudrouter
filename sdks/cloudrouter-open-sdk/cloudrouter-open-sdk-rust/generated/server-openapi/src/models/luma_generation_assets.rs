use serde::{Deserialize, Serialize};

/// Luma generation assets.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LumaGenerationAssets {
    /// Generated image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// Generated video URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video: Option<String>,
}
