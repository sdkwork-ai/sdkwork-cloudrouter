use serde::{Deserialize, Serialize};

/// Storage quota policy schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageQuotaPolicy {
    /// Created at field on storage quota policy.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Enforcement field on storage quota policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enforcement: Option<String>,

    /// Id field on storage quota policy.
    pub id: String,

    /// Limit field on storage quota policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<String>,

    /// Quota limit bytes field on storage quota policy.
    #[serde(rename = "quotaLimitBytes")]
    pub quota_limit_bytes: String,

    /// Scope id field on storage quota policy.
    #[serde(rename = "scopeId")]
    pub scope_id: String,

    /// Scope type field on storage quota policy.
    #[serde(rename = "scopeType")]
    pub scope_type: String,

    /// Single file limit bytes field on storage quota policy.
    #[serde(rename = "singleFileLimitBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub single_file_limit_bytes: Option<String>,

    /// Status field on storage quota policy.
    pub status: String,

    /// Updated at field on storage quota policy.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,

    /// Used field on storage quota policy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub used: Option<String>,

    /// Used bytes field on storage quota policy.
    #[serde(rename = "usedBytes")]
    pub used_bytes: String,
}
