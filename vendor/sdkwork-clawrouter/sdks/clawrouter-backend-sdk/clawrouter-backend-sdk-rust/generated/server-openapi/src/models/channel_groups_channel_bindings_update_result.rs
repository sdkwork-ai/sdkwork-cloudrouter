use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupChannelBindingsResponse};

/// Channel groups channel bindings update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelGroupsChannelBindingsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on channel groups channel bindings update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminChannelGroupChannelBindingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
