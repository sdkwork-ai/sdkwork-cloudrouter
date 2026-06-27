use serde::{Deserialize, Serialize};

use crate::models::{AppChannelGroupListResponse};

/// Channel groups list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelGroupsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on channel groups list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AppChannelGroupListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
