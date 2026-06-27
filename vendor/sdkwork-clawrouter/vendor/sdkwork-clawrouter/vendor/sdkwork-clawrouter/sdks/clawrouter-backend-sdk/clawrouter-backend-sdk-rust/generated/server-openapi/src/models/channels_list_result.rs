use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelsResponse};

/// Channels list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on channels list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminChannelsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
