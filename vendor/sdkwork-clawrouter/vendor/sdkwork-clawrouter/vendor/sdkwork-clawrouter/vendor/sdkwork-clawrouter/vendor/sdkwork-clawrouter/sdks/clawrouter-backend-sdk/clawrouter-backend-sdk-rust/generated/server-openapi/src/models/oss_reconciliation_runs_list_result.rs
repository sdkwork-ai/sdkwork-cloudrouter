use serde::{Deserialize, Serialize};

use crate::models::{StorageReconciliationRunListResponse};

/// Oss reconciliation runs list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssReconciliationRunsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss reconciliation runs list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageReconciliationRunListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
