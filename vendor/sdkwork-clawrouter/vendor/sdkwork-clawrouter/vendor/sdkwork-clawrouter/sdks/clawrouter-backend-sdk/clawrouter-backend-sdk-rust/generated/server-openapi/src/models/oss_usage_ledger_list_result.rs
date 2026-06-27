use serde::{Deserialize, Serialize};

use crate::models::{StorageUsageLedgerListResponse};

/// Oss usage ledger list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssUsageLedgerListResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss usage ledger list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageUsageLedgerListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
