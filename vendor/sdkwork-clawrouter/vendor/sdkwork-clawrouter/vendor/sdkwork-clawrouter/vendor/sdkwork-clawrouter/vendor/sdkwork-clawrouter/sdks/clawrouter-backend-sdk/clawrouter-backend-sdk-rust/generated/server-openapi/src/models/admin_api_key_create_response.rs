use serde::{Deserialize, Serialize};

use crate::models::{AdminApiKeyItem};

/// Admin api key create response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminApiKeyCreateResponse {
    /// Key field on admin api key create response.
    pub key: AdminApiKeyItem,

    /// Full plaintext API key material returned immediately after creation.
    #[serde(rename = "rawKey")]
    pub raw_key: String,
}
