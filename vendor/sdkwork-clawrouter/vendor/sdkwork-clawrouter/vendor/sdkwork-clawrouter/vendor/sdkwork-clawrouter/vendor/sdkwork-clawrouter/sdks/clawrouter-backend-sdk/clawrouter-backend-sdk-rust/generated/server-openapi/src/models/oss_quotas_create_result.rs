use serde::{Deserialize, Serialize};

use crate::models::{StorageQuotaPolicyMutationResponse};

/// Oss quotas create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssQuotasCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss quotas create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageQuotaPolicyMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
