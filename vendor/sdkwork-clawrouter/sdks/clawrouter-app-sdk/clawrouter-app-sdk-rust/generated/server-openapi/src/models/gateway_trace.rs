use serde::{Deserialize, Serialize};

/// Gateway trace schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GatewayTrace {
    /// Channel field on gateway trace.
    pub channel: String,

    /// HTTP latency display value, for example 128ms.
    pub duration: String,

    /// Endpoint field on gateway trace.
    pub endpoint: String,

    /// Id field on gateway trace.
    pub id: String,

    /// Masked client IP address.
    pub ip: String,

    /// Method field on gateway trace.
    pub method: String,

    /// Status field on gateway trace.
    pub status: i64,

    /// Time field on gateway trace.
    pub time: String,
}
