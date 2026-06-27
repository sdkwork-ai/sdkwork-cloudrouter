use serde::{Deserialize, Serialize};

/// Persisted rate limit rule snapshot returned by the backend.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRateLimitItem {
    /// Block duration field on admin rate limit item.
    #[serde(rename = "blockDuration")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block_duration: Option<String>,

    /// Burst field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub burst: Option<i64>,

    /// Channel group field on admin rate limit item.
    #[serde(rename = "channelGroup")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_group: Option<String>,

    /// Channel group id field on admin rate limit item.
    #[serde(rename = "channelGroupId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_group_id: Option<String>,

    /// Channel group name field on admin rate limit item.
    #[serde(rename = "channelGroupName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_group_name: Option<String>,

    /// Id field on admin rate limit item.
    pub id: String,

    /// Key prefix field on admin rate limit item.
    #[serde(rename = "keyPrefix")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_prefix: Option<String>,

    /// Model field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Rpd field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rpd: Option<i64>,

    /// Rpm field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rpm: Option<i64>,

    /// Rps field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rps: Option<i64>,

    /// Rule name field on admin rate limit item.
    #[serde(rename = "ruleName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rule_name: Option<String>,

    /// Status field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Target ip field on admin rate limit item.
    #[serde(rename = "targetIp")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_ip: Option<String>,

    /// Tpm field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tpm: Option<i64>,

    /// User field on admin rate limit item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user: Option<String>,
}
