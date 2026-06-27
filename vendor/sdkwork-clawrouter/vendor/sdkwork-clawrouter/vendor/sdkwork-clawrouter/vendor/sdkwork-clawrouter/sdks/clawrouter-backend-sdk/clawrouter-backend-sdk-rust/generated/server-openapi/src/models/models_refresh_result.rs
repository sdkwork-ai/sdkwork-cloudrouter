use serde::{Deserialize, Serialize};

use crate::models::{AdminModelCatalogSyncResponse};

/// Models refresh result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelsRefreshResult {
    /// Business response code.
    pub code: String,

    /// Data field on models refresh result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminModelCatalogSyncResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
