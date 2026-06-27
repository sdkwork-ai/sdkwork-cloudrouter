use serde::{Deserialize, Serialize};

use crate::models::{AdminDeleteResponse};

/// Models delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelsDeleteResult {
    /// Business response code.
    pub code: String,

    /// Data field on models delete result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminDeleteResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
