use serde::{Deserialize, Serialize};

use crate::models::{MiniMaxMusicExtraInfo};

/// Mini max music data schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicData {
    /// Generated audio URL when output_format is url, otherwise hex-encoded audio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<String>,

    /// Extra info field on the mini max music data, using the mini max music extra info module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra_info: Option<MiniMaxMusicExtraInfo>,

    /// MiniMax task status: 1 means in progress, 2 means finished.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<i64>,
}
