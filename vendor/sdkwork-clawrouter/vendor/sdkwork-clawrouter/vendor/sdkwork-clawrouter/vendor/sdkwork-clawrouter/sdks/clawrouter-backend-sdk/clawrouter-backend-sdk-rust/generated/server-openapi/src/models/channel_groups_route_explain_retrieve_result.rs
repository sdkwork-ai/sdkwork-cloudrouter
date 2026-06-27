use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupRouteExplainResponse};

/// Channel groups route explain retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChannelGroupsRouteExplainRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on channel groups route explain retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminChannelGroupRouteExplainResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
