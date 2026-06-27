use serde::{Deserialize, Serialize};

use crate::models::{AdminRuntimeRegionSettingsResponse};

/// Runtime region settings update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeRegionSettingsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on runtime region settings update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminRuntimeRegionSettingsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
