use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteChannelsResponse};

/// Site channels list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SiteChannelsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on site channels list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminSiteChannelsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
