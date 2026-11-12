use serde::{Deserialize, Serialize};

use crate::models::MinimaxBaseResp;

/// MiniMax file metadata and its download URL.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxFileRetrieveResponse {
    /// Base resp field on the minimax file retrieve response, using the minimax base resp module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_resp: Option<MinimaxBaseResp>,

    /// File envelope carrying download_url, file_id, bytes, filename, and created_at.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<std::collections::HashMap<String, String>>,
}
