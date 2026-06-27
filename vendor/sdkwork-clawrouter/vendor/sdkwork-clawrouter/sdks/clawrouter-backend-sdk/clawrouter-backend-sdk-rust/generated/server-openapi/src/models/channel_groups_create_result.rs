use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupMutationResponse};

/// Channel groups create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelGroupsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on channel groups create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminChannelGroupMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
