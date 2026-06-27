use serde::{Deserialize, Serialize};

/// Admin ip limit create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminIpLimitCreateRequest {
    /// Gateway block duration label or duration expression.
    #[serde(rename = "blockDuration")]
    pub block_duration: String,

    /// Maximum requests per minute for the target.
    pub rpm: i64,

    /// Maximum requests per second for the target.
    pub rps: i64,

    /// Human-readable IP rate limit rule name.
    #[serde(rename = "ruleName")]
    pub rule_name: String,

    /// Status field on admin ip limit create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// IP address, CIDR block, or gateway-recognized IP target expression.
    #[serde(rename = "targetIp")]
    pub target_ip: String,
}
