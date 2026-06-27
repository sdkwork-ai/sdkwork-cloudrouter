use serde::{Deserialize, Serialize};

use crate::models::{StorageGarbageCollectionJobListResponse};

/// Oss gc jobs list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssGcJobsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss gc jobs list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageGarbageCollectionJobListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
