use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteDeleteResponse};

/// Site delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SiteDeleteResult {
    /// Business response code.
    pub code: String,

    /// Data field on site delete result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminSiteDeleteResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
