use serde::{Deserialize, Serialize};

use crate::models::{UpdateApiKeyResponse};

/// Api keys update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ApiKeysUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on api keys update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<UpdateApiKeyResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
