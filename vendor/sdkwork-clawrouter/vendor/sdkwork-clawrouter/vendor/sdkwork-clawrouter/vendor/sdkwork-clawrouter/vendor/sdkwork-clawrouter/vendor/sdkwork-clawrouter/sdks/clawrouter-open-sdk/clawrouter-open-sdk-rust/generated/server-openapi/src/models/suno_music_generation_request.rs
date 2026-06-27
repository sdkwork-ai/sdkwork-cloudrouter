use serde::{Deserialize, Serialize};

/// Suno-compatible suno music generation request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SunoMusicGenerationRequest {
    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Requested duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Suno-compatible model identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Musical styles to avoid.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub negative_tags: Option<String>,

    /// Lyrics or text prompt for music generation.
    pub prompt: String,

    /// Musical style tags.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: Option<String>,

    /// Requested song title.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
