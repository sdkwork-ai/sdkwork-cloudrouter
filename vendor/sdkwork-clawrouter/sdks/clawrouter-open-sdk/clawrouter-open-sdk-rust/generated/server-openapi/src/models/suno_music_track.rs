use serde::{Deserialize, Serialize};

/// Suno-compatible suno music track schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SunoMusicTrack {
    /// Generated audio URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,

    /// Track duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,

    /// Track identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Cover image URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,

    /// Generated lyrics.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<String>,

    /// Track title.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,

    /// Generated video URL when supplied.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
}
