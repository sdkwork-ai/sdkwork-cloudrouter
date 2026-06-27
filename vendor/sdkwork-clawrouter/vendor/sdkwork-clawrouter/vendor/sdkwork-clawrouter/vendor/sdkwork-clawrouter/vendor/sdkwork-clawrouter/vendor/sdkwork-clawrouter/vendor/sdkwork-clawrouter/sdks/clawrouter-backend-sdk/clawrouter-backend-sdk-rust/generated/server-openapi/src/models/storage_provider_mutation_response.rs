use serde::{Deserialize, Serialize};

use crate::models::{StorageProviderConfig};

/// Storage provider mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageProviderMutationResponse {
    /// Provider field on storage provider mutation response.
    pub provider: StorageProviderConfig,

    /// Request id field on storage provider mutation response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
