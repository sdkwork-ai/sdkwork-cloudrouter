use serde::{Deserialize, Serialize};

/// Vidu template video request schema (motion sync templates such as motion_control_2) exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduTemplateRequest {
    /// Template id, for example motion_control_2 or motion_control_2.5.
    pub template: String,

    /// Character image URLs (single front-facing person).
    pub images: Vec<String>,

    /// Motion reference video URLs (single front-facing person, 3-30 seconds).
    pub video_urls: Vec<String>,

    /// Opaque passthrough parameter echoed by task queries.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,
}
