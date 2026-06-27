use serde::{Deserialize, Serialize};

/// Generated media record returned by Vidu task creation endpoints.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduCreation {
    /// Generated audio URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,

    /// Cover image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_url: Option<String>,

    /// Creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Media duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Media height in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height: Option<i64>,

    /// Vidu creation identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Generated image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    /// Metadata field on the vidu creation, using the provider generated media metadata module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Creation object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,

    /// Provider URI for the creation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,

    /// Primary creation URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Generated video URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,

    /// Media width in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub width: Option<i64>,
}
