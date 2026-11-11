use serde::{Deserialize, Serialize};

/// MiniMax music audio output configuration.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicAudioSetting {
    /// Output bitrate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bitrate: Option<i64>,

    /// Output container format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,

    /// Output sample rate.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sample_rate: Option<i64>,
}
