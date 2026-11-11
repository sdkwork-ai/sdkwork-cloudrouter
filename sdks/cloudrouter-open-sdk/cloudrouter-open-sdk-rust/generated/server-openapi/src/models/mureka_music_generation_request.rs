use serde::{Deserialize, Serialize};

/// Mureka song generation request.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MurekaMusicGenerationRequest {
    /// Optional callback URL for task completion.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Requested duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Lyrics to sing, when the caller supplies them instead of a prompt.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<String>,

    /// Mureka music model id, for example mureka-o1.
    pub model: String,

    /// Description of the song to generate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Optional reference audio URL that steers the style.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reference_audio_url: Option<String>,

    /// Style or mood tags that steer the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,

    /// Song title.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}
