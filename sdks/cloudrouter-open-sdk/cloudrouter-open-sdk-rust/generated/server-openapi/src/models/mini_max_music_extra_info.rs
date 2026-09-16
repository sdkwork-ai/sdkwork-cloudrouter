use serde::{Deserialize, Serialize};

/// Mini max music extra info schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicExtraInfo {
    /// Generated audio bitrate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bitrate: Option<i64>,

    /// Generated audio channel count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub music_channel: Option<i64>,

    /// Generated music duration in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub music_duration: Option<f64>,

    /// Generated audio sample rate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub music_sample_rate: Option<i64>,

    /// Generated audio size in bytes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub music_size: Option<i64>,
}
