use serde::{Deserialize, Serialize};

use crate::models::{StorageGarbageCollectionJob};

/// Storage garbage collection job mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageGarbageCollectionJobMutationResponse {
    /// Job field on storage garbage collection job mutation response.
    pub job: StorageGarbageCollectionJob,

    /// Request id field on storage garbage collection job mutation response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
