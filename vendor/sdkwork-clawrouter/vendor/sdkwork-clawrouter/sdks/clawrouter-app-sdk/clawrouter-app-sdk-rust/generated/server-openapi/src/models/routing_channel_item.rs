use serde::{Deserialize, Serialize};

use crate::models::{RoutingCircuitBreakerPolicy, RoutingRetryPolicy};

/// Routing channel item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingChannelItem {
    /// Access type field on routing channel item.
    #[serde(rename = "accessType")]
    pub access_type: String,

    /// Masked credential label from the selected upstream credential. Raw secret material is never returned.
    #[serde(rename = "apiKey")]
    pub api_key: String,

    /// Balance field on routing channel item.
    pub balance: String,

    /// Base url field on routing channel item.
    #[serde(rename = "baseUrl")]
    pub base_url: String,

    /// Capabilities field on routing channel item.
    pub capabilities: Vec<String>,

    /// Circuit breaker policy field on routing channel item.
    #[serde(rename = "circuitBreakerPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub circuit_breaker_policy: Option<RoutingCircuitBreakerPolicy>,

    /// Errors field on routing channel item.
    pub errors: String,

    /// Id field on routing channel item.
    pub id: String,

    /// Is multimodal field on routing channel item.
    #[serde(rename = "isMultimodal")]
    pub is_multimodal: bool,

    /// Latency field on routing channel item.
    pub latency: String,

    /// Models field on routing channel item.
    pub models: Vec<String>,

    /// Name field on routing channel item.
    pub name: String,

    /// Protocol field on routing channel item.
    pub protocol: String,

    /// Provider field on routing channel item.
    pub provider: String,

    /// Provider code field on routing channel item.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Retry policy field on routing channel item.
    #[serde(rename = "retryPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retry_policy: Option<RoutingRetryPolicy>,

    /// Rpm field on routing channel item.
    pub rpm: String,

    /// Status field on routing channel item.
    pub status: String,

    /// Timeout ms field on routing channel item.
    #[serde(rename = "timeoutMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<String>,

    /// Vendor field on routing channel item.
    pub vendor: String,

    /// Weight field on routing channel item.
    pub weight: String,
}
