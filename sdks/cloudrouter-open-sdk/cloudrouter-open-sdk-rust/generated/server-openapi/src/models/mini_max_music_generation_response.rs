use serde::{Deserialize, Serialize};

use crate::models::{MiniMaxMusicBaseResp, MiniMaxMusicData};

/// MiniMax music generation response exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicGenerationResponse {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_resp: Option<MiniMaxMusicBaseResp>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<MiniMaxMusicData>,

    /// MiniMax trace identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}
