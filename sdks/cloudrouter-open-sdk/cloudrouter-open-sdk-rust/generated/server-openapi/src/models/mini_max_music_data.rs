use serde::{Deserialize, Serialize};

use crate::models::{MiniMaxMusicExtraInfo};

/// MiniMax music generation data payload.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicData {
    /// MiniMax task status: 1 means in progress, 2 means finished.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<i64>,

    /// Generated audio URL when output_format is url, otherwise hex-encoded audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra_info: Option<MiniMaxMusicExtraInfo>,
}
