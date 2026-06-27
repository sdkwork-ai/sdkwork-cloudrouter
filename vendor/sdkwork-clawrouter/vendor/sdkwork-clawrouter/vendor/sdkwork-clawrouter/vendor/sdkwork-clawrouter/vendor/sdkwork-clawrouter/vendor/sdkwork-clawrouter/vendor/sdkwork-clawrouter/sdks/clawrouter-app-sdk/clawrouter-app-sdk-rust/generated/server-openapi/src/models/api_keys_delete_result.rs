use serde::{Deserialize, Serialize};

use crate::models::{DeleteApiKeyResponse};

/// Api keys delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ApiKeysDeleteResult {
    /// Business response code.
    pub code: String,

    /// Data field on api keys delete result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<DeleteApiKeyResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
