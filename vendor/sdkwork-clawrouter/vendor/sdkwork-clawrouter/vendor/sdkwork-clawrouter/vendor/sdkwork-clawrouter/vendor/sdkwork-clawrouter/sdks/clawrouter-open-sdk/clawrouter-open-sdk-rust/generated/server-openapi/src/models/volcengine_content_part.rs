use serde::{Deserialize, Serialize};

/// Volcengine Ark volcengine content part schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VolcengineContentPart {
    /// Provider file identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Input image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    /// Text prompt content.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Content part type.
    pub r#type: String,

    /// Input video URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
}
