use serde::{Deserialize, Serialize};

/// Dashboard chart point schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DashboardChartPoint {
    /// Audio whisper field on dashboard chart point.
    #[serde(rename = "audio (Whisper)")]
    pub audio_whisper: f64,

    /// Image midjourney field on dashboard chart point.
    #[serde(rename = "image (Midjourney/DALL-E)")]
    pub image_midjourney_dall_e: f64,

    /// Llm text field on dashboard chart point.
    #[serde(rename = "llm (Text)")]
    pub llm_text: f64,

    /// Music suno field on dashboard chart point.
    #[serde(rename = "music (Suno)")]
    pub music_suno: f64,

    /// Time field on dashboard chart point.
    pub time: String,

    /// Video runway sora field on dashboard chart point.
    #[serde(rename = "video (Runway/Sora)")]
    pub video_runway_sora: f64,
}
