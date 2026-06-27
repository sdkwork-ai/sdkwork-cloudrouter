use serde::{Deserialize, Serialize};

/// Update api key request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UpdateApiKeyRequest {
    /// API key channel group code to bind to this key.
    #[serde(rename = "channelGroup")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_group: Option<String>,

    /// Marks this API key as the default backend runtime API key for Playground and app runtime calls.
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

    /// Modalities field on update api key request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Vec<String>>,

    /// API key display name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Optional quota limit as a canonical decimal string.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub quota: Option<String>,
}
