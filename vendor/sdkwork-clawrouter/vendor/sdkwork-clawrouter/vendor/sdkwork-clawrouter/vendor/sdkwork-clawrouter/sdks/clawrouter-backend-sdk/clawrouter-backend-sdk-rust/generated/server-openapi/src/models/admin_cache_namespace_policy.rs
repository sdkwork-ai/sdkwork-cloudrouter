use serde::{Deserialize, Serialize};

/// Admin cache namespace policy schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminCacheNamespacePolicy {
    /// Consistency field on admin cache namespace policy.
    pub consistency: String,

    /// Enabled field on admin cache namespace policy.
    pub enabled: bool,

    /// Failure mode field on admin cache namespace policy.
    #[serde(rename = "failureMode")]
    pub failure_mode: String,

    /// Instance name field on admin cache namespace policy.
    #[serde(rename = "instanceName")]
    pub instance_name: String,

    /// Jitter percent field on admin cache namespace policy.
    #[serde(rename = "jitterPercent")]
    pub jitter_percent: String,

    /// Namespace field on admin cache namespace policy.
    pub namespace: String,

    /// Scope field on admin cache namespace policy.
    pub scope: String,

    /// Sensitivity field on admin cache namespace policy.
    pub sensitivity: String,

    /// Stale while revalidate seconds field on admin cache namespace policy.
    #[serde(rename = "staleWhileRevalidateSeconds")]
    pub stale_while_revalidate_seconds: String,

    /// Tags field on admin cache namespace policy.
    pub tags: Vec<String>,

    /// Ttl seconds field on admin cache namespace policy.
    #[serde(rename = "ttlSeconds")]
    pub ttl_seconds: String,
}
