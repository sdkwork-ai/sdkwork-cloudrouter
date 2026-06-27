use serde::{Deserialize, Serialize};

use crate::models::{StorageProviderMutationResponse};

/// Oss providers update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OssProvidersUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on oss providers update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<StorageProviderMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
