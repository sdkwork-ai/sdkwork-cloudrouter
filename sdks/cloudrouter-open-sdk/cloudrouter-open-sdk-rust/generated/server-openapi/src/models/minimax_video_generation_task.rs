use serde::{Deserialize, Serialize};

use crate::models::MinimaxBaseResp;

/// MiniMax asynchronous video generation task, its status, and the produced file id.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxVideoGenerationTask {
    /// Base resp field on the minimax video generation task, using the minimax base resp module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_resp: Option<MinimaxBaseResp>,

    /// Generated file identifier; resolve it to a URL through the file retrieve endpoint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// MiniMax video generation task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Generated video height in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_height: Option<i64>,

    /// Generated video width in pixels.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_width: Option<i64>,
}
