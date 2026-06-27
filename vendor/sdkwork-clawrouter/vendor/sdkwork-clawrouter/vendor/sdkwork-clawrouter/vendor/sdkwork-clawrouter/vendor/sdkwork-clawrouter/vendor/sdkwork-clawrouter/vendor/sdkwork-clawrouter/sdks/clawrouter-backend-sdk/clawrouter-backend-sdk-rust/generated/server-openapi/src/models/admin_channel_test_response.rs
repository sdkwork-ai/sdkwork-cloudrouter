use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelItem};

/// Admin channel test response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelTestResponse {
    /// Channel id field on admin channel test response.
    #[serde(rename = "channelId")]
    pub channel_id: String,

    /// Item field on admin channel test response.
    pub item: AdminChannelItem,

    /// Latency field on admin channel test response.
    pub latency: String,

    /// Status field on admin channel test response.
    pub status: String,

    /// Success field on admin channel test response.
    pub success: bool,
}
