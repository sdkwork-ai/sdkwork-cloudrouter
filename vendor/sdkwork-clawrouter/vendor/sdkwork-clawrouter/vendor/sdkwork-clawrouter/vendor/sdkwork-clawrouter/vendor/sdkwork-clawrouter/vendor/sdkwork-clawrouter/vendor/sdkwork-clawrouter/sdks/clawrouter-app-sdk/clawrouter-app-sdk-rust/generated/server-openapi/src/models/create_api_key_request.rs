use serde::{Deserialize, Serialize};

/// Create api key request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateApiKeyRequest {
    /// API key channel group code.
    #[serde(rename = "channelGroup")]
    pub channel_group: String,

    /// Create this key as the default backend runtime API key.
    #[serde(rename = "defaultForRuntime")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_for_runtime: Option<bool>,

    /// Expiration timestamp in YYYY-MM-DDTHH:mm format, or never.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires: Option<String>,

    /// Comma-separated IP or CIDR allowlist, or unrestricted.
    #[serde(rename = "ipLimit")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ip_limit: Option<String>,

    /// Whether the quota is unlimited.
    #[serde(rename = "isUnlimitedQuota")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub is_unlimited_quota: Option<bool>,

    /// Modalities field on create api key request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// API key display name.
    pub name: String,

    /// Optional quota limit as a canonical decimal string.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quota: Option<String>,
}
