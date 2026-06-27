use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelMutationResponse};

/// Channels create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on channels create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminChannelMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
