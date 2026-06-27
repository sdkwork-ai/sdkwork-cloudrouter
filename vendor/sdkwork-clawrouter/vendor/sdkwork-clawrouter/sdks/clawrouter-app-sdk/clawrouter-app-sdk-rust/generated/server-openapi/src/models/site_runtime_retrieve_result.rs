use serde::{Deserialize, Serialize};

use crate::models::{SiteRuntimeSettingsResponse};

/// Site runtime retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SiteRuntimeRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on site runtime retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<SiteRuntimeSettingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
