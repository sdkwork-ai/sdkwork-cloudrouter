use serde::{Deserialize, Serialize};

/// One Luma keyframe: an image URL (`type=image`) or another generation id (`type=generation`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct LumaKeyframe {
    /// Generation id when `type` is `generation`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Keyframe reference type.
    pub r#type: String,

    /// Image URL when `type` is `image`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
