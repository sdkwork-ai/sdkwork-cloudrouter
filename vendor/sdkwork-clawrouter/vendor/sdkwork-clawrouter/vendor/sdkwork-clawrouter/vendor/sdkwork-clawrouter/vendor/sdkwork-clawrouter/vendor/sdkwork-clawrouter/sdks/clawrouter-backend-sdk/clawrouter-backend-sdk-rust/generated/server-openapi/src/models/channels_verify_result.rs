use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelTestResponse};

/// Channels verify result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelsVerifyResult {
    /// Business response code.
    pub code: String,

    /// Data field on channels verify result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminChannelTestResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
