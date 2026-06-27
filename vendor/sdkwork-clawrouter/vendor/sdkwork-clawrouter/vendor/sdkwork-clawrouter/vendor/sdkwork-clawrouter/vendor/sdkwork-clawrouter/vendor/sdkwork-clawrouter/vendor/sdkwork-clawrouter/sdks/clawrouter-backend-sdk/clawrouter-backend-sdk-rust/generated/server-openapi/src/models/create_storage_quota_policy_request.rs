use serde::{Deserialize, Serialize};

/// Create storage quota policy request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateStorageQuotaPolicyRequest {
    /// Enforcement field on create storage quota policy request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enforcement: Option<String>,

    /// Quota limit field on create storage quota policy request.
    #[serde(rename = "quotaLimit")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quota_limit: Option<String>,

    /// Quota limit bytes field on create storage quota policy request.
    #[serde(rename = "quotaLimitBytes")]
    pub quota_limit_bytes: String,

    /// Scope id field on create storage quota policy request.
    #[serde(rename = "scopeId")]
    pub scope_id: String,

    /// Scope type field on create storage quota policy request.
    #[serde(rename = "scopeType")]
    pub scope_type: String,

    /// Single file limit bytes field on create storage quota policy request.
    #[serde(rename = "singleFileLimitBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub single_file_limit_bytes: Option<String>,
}
