use serde::{Deserialize, Serialize};

use crate::models::{CreateApiKeyResponse};

/// Api keys create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ApiKeysCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on api keys create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<CreateApiKeyResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
