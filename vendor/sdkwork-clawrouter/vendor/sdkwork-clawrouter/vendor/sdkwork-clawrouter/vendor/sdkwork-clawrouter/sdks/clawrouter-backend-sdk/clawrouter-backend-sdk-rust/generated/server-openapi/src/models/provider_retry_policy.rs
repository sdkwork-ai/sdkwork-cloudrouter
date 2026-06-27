use serde::{Deserialize, Serialize};

/// Provider retry policy schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderRetryPolicy {
    /// Backoff ms field on provider retry policy.
    #[serde(rename = "backoffMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub backoff_ms: Option<i64>,

    /// Max attempts field on provider retry policy.
    #[serde(rename = "maxAttempts")]
    pub max_attempts: i64,

    /// Retryable status codes field on provider retry policy.
    #[serde(rename = "retryableStatusCodes")]
    pub retryable_status_codes: Vec<i64>,
}
