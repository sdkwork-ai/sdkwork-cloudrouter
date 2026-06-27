use serde::{Deserialize, Serialize};

/// Verification policy update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VerificationPolicyUpdateRequest {
    /// Allowed channels field on verification policy update request.
    #[serde(rename = "allowedChannels")]
    pub allowed_channels: Vec<String>,

    /// Code length field on verification policy update request.
    #[serde(rename = "codeLength")]
    pub code_length: i64,

    /// Default channel field on verification policy update request.
    #[serde(rename = "defaultChannel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_channel: Option<String>,

    /// Max send per hour field on verification policy update request.
    #[serde(rename = "maxSendPerHour")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_send_per_hour: Option<i64>,

    /// Max verify attempts field on verification policy update request.
    #[serde(rename = "maxVerifyAttempts")]
    pub max_verify_attempts: i64,

    /// Resend interval seconds field on verification policy update request.
    #[serde(rename = "resendIntervalSeconds")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resend_interval_seconds: Option<i64>,

    /// Risk policy field on verification policy update request.
    #[serde(rename = "riskPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub risk_policy: Option<std::collections::HashMap<String, String>>,

    /// Template code field on verification policy update request.
    #[serde(rename = "templateCode")]
    pub template_code: String,

    /// Ttl seconds field on verification policy update request.
    #[serde(rename = "ttlSeconds")]
    pub ttl_seconds: i64,
}
