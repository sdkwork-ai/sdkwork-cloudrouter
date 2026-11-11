use serde::{Deserialize, Serialize};

/// MiniMax business status envelope returned by every media endpoint.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxBaseResp {
    /// MiniMax business status code; 0 means success.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_code: Option<i64>,

    /// MiniMax business status message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_msg: Option<String>,
}
