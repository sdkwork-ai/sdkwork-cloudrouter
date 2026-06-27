use serde::{Deserialize, Serialize};

use crate::models::{StorageGarbageCollectionJobMutationResponse};

/// Oss gc jobs create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssGcJobsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss gc jobs create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageGarbageCollectionJobMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
