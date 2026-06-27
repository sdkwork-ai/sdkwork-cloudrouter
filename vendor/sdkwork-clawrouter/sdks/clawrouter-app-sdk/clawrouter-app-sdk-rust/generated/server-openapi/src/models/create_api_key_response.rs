use serde::{Deserialize, Serialize};

use crate::models::{AppApiKeyItem};

/// Create api key response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateApiKeyResponse {
    /// Item field on create api key response.
    pub item: AppApiKeyItem,

    /// Full raw API key secret returned by create responses. Authenticated owner management list and update responses also expose this value as item.copyableKey for console copy actions.
    #[serde(rename = "rawKey")]
    pub raw_key: String,
}
