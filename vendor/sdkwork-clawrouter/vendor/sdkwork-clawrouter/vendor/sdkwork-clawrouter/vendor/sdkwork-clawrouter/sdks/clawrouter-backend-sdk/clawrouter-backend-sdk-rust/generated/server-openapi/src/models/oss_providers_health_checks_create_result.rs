use serde::{Deserialize, Serialize};

use crate::models::{StorageProviderHealthCheckResponse};

/// Oss providers health checks create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssProvidersHealthChecksCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss providers health checks create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageProviderHealthCheckResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
