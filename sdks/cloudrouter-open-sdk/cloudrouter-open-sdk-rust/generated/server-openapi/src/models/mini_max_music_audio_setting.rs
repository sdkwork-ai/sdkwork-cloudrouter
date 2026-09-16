use serde::{Deserialize, Serialize};

/// MiniMax music generation audio setting.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicAudioSetting {
    /// Output sample rate: 16000, 24000, 32000, or 44100.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sample_rate: Option<i64>,

    /// Output bitrate: 32000, 64000, 128000, or 256000.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bitrate: Option<i64>,

    /// Output container: mp3, wav, or pcm.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
}
