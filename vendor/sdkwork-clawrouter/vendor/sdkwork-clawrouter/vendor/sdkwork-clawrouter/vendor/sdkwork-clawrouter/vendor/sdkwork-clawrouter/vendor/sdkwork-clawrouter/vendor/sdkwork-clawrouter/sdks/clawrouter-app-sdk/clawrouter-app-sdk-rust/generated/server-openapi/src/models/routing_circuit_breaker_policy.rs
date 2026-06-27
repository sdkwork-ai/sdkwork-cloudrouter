use serde::{Deserialize, Serialize};

/// Routing circuit breaker policy schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingCircuitBreakerPolicy {
    /// Failure threshold field on routing circuit breaker policy.
    #[serde(rename = "failureThreshold")]
    pub failure_threshold: String,
}
