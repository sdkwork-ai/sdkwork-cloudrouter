use serde::{Deserialize, Serialize};

use crate::models::{AdminSitesResponse};

/// Site catalog list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SiteCatalogListResult {
    /// Business response code.
    pub code: String,

    /// Data field on site catalog list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminSitesResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
