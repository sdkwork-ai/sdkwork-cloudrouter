use serde::{Deserialize, Serialize};

use crate::models::{AdminModelVendorsResponse};

/// Model vendors list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelVendorsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on model vendors list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminModelVendorsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
