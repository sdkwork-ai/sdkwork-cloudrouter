use serde::{Deserialize, Serialize};

use crate::models::{StorageUsageSnapshotListResponse};

/// Oss usage snapshots list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssUsageSnapshotsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss usage snapshots list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageUsageSnapshotListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
