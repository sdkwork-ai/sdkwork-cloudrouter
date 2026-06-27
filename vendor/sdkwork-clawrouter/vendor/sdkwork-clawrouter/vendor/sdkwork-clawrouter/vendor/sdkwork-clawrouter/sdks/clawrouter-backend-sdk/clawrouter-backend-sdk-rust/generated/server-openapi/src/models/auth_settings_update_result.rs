use serde::{Deserialize, Serialize};

use crate::models::{AdminAuthSettingsResponse};

/// Auth settings update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AuthSettingsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on auth settings update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAuthSettingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
