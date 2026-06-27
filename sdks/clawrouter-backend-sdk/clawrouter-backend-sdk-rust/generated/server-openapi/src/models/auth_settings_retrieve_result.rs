use serde::{Deserialize, Serialize};

use crate::models::{AdminAuthSettingsResponse};

/// Auth settings retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AuthSettingsRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on auth settings retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminAuthSettingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
