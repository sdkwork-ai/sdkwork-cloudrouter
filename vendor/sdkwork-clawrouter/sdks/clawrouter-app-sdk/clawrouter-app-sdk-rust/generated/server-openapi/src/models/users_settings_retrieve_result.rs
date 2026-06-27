use serde::{Deserialize, Serialize};

use crate::models::{SettingsDataResponse};

/// Users settings retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UsersSettingsRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on users settings retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<SettingsDataResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
