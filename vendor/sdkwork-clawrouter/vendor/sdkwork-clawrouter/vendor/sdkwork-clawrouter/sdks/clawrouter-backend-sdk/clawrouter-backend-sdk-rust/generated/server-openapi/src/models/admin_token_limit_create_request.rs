use serde::{Deserialize, Serialize};

/// Admin token limit create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminTokenLimitCreateRequest {
    /// Allowed short-term burst capacity.
    pub burst: i64,

    /// Masked API key prefix or gateway key selector.
    #[serde(rename = "keyPrefix")]
    pub key_prefix: String,

    /// Maximum requests per day for the API key.
    pub rpd: i64,

    /// Maximum requests per second for the API key.
    pub rps: i64,

    /// Status field on admin token limit create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// User identifier or display name attached to the token limit rule.
    pub user: String,
}
