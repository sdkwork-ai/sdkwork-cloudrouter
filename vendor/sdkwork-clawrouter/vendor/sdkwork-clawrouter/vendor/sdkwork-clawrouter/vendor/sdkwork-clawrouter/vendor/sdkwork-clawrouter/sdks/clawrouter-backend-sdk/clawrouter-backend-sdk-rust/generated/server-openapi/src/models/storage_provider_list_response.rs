use serde::{Deserialize, Serialize};

use crate::models::{StorageProviderConfig};

/// Storage provider list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageProviderListResponse {
    /// Items field on storage provider list response.
    pub items: Vec<StorageProviderConfig>,

    /// Request id field on storage provider list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
