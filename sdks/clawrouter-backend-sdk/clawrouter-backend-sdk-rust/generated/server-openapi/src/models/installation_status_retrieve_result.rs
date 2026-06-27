use serde::{Deserialize, Serialize};

use crate::models::{InstallationStatusResponse};

/// Installation status retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct InstallationStatusRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on installation status retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<InstallationStatusResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
