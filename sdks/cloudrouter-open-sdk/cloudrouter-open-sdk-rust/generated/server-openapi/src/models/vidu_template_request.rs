use serde::{Deserialize, Serialize};

/// Vidu vidu template request schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduTemplateRequest {
    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Character image URLs (single front-facing person).
    pub images: Vec<String>,

    /// Opaque request parameter echoed back by task queries.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Template id, for example motion_control_2 or motion_control_2.5.
    pub template: String,

    /// Motion reference video URLs (single front-facing person, 3-30 seconds).
    pub video_urls: Vec<String>,
}
