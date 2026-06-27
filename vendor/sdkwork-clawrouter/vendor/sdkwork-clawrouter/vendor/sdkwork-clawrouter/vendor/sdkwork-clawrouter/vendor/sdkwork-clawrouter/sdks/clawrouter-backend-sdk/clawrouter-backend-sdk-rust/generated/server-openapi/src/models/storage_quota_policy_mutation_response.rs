use serde::{Deserialize, Serialize};

use crate::models::{StorageQuotaPolicy};

/// Storage quota policy mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageQuotaPolicyMutationResponse {
    /// Quota policy field on storage quota policy mutation response.
    #[serde(rename = "quotaPolicy")]
    pub quota_policy: StorageQuotaPolicy,

    /// Request id field on storage quota policy mutation response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
