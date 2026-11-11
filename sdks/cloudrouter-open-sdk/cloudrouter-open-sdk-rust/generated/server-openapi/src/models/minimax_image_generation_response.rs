use serde::{Deserialize, Serialize};

use crate::models::{MinimaxBaseResp, MinimaxImageData};

/// MiniMax image generation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxImageGenerationResponse {
    /// Base resp field on the minimax image generation response, using the minimax base resp module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_resp: Option<MinimaxBaseResp>,

    /// Data field on the minimax image generation response, using the minimax image data module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<MinimaxImageData>,

    /// MiniMax request identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Generation counters such as succeeded_count and failed_count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
