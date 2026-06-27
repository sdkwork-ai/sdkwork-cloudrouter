use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteSettingsResponse};

/// Site settings retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SiteSettingsRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on site settings retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminSiteSettingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
