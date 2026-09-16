use serde::{Deserialize, Serialize};

use crate::models::{MiniMaxMusicBaseResp, MiniMaxMusicData};

/// Mini max music generation response schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicGenerationResponse {
    /// Base resp field on the mini max music generation response, using the mini max music base resp module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_resp: Option<MiniMaxMusicBaseResp>,

    /// Data field on the mini max music generation response, using the mini max music data module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<MiniMaxMusicData>,

    /// MiniMax trace identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}
