use serde::{Deserialize, Serialize};

use crate::models::{StorageReconciliationRunMutationResponse};

/// Oss reconciliation runs create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssReconciliationRunsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss reconciliation runs create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageReconciliationRunMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
