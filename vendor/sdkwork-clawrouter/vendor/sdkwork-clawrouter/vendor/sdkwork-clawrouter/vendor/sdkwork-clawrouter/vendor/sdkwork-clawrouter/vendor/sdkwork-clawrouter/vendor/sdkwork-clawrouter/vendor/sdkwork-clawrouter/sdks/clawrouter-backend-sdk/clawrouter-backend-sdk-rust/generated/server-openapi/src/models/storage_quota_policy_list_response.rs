use serde::{Deserialize, Serialize};

use crate::models::{StorageQuotaPolicy};

/// Storage quota policy list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageQuotaPolicyListResponse {
    /// Items field on storage quota policy list response.
    pub items: Vec<StorageQuotaPolicy>,

    /// Request id field on storage quota policy list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
