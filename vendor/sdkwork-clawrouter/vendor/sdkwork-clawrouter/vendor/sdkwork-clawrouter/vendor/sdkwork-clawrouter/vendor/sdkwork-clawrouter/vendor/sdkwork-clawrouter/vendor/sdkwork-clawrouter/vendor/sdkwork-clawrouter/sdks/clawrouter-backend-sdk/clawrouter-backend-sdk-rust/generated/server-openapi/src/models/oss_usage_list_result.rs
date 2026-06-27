use serde::{Deserialize, Serialize};

use crate::models::{StorageUsageCounterListResponse};

/// Oss usage list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssUsageListResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss usage list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageUsageCounterListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
