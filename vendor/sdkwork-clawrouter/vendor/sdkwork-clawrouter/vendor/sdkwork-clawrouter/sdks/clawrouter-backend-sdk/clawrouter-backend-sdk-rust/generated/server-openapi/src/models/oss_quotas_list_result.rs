use serde::{Deserialize, Serialize};

use crate::models::{StorageQuotaPolicyListResponse};

/// Oss quotas list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssQuotasListResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss quotas list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageQuotaPolicyListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
