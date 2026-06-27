use serde::{Deserialize, Serialize};

/// Provider circuit breaker policy schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderCircuitBreakerPolicy {
    /// Failure threshold field on provider circuit breaker policy.
    #[serde(rename = "failureThreshold")]
    pub failure_threshold: i64,
}
