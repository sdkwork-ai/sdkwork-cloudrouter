use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteSettingsResponse};

/// Site settings update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SiteSettingsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on site settings update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminSiteSettingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
