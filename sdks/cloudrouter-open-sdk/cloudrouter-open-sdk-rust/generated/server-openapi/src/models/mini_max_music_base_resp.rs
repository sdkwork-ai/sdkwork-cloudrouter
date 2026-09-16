use serde::{Deserialize, Serialize};

/// Mini max music base resp schema exposed by Cloud Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MiniMaxMusicBaseResp {
    /// MiniMax status code; 0 means success.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_code: Option<i64>,

    /// MiniMax status message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_msg: Option<String>,
}
