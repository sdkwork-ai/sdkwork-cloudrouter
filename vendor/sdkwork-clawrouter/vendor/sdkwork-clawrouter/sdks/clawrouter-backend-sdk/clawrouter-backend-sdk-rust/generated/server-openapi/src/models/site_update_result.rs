use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteMutationResponse};

/// Site update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SiteUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on site update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminSiteMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
