use serde::{Deserialize, Serialize};

use crate::models::MinimaxBaseResp;

/// MiniMax T2A v2 response. data.audio is hex-encoded audio; usage_characters is the billed count.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxTextToSpeechResponse {
    /// Base resp field on the minimax text to speech response, using the minimax base resp module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_resp: Option<MinimaxBaseResp>,

    /// Audio envelope carrying the hex-encoded audio payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<std::collections::HashMap<String, String>>,

    /// Synthesis metrics: audio_length, audio_size, word_count, and usage_characters.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra_info: Option<std::collections::HashMap<String, String>>,

    /// MiniMax trace id for support.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}
