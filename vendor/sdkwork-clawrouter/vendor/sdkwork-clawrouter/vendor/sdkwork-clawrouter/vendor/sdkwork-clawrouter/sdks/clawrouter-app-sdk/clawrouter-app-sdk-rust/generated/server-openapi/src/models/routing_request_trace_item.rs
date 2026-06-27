use serde::{Deserialize, Serialize};

/// Routing request trace item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RoutingRequestTraceItem {
    /// Channel field on routing request trace item.
    pub channel: String,

    /// Duration field on routing request trace item.
    pub duration: String,

    /// Ended at field on routing request trace item.
    #[serde(rename = "endedAt")]
    pub ended_at: String,

    /// Error message masked field on routing request trace item.
    #[serde(rename = "errorMessageMasked")]
    pub error_message_masked: String,

    /// Error type field on routing request trace item.
    #[serde(rename = "errorType")]
    pub error_type: String,

    /// Http method field on routing request trace item.
    #[serde(rename = "httpMethod")]
    pub http_method: String,

    /// Id field on routing request trace item.
    pub id: String,

    /// Model field on routing request trace item.
    pub model: String,

    /// Provider error code field on routing request trace item.
    #[serde(rename = "providerErrorCode")]
    pub provider_error_code: String,

    /// Request bytes field on routing request trace item.
    #[serde(rename = "requestBytes")]
    pub request_bytes: String,

    /// Request id field on routing request trace item.
    #[serde(rename = "requestId")]
    pub request_id: String,

    /// Request path field on routing request trace item.
    #[serde(rename = "requestPath")]
    pub request_path: String,

    /// Request payload hash field on routing request trace item.
    #[serde(rename = "requestPayloadHash")]
    pub request_payload_hash: String,

    /// Response bytes field on routing request trace item.
    #[serde(rename = "responseBytes")]
    pub response_bytes: String,

    /// Response payload hash field on routing request trace item.
    #[serde(rename = "responsePayloadHash")]
    pub response_payload_hash: String,

    /// Started at field on routing request trace item.
    #[serde(rename = "startedAt")]
    pub started_at: String,

    /// Status field on routing request trace item.
    pub status: String,

    /// Streaming field on routing request trace item.
    pub streaming: bool,

    /// Time field on routing request trace item.
    pub time: String,

    /// Tokens field on routing request trace item.
    pub tokens: String,

    /// Trace id field on routing request trace item.
    #[serde(rename = "traceId")]
    pub trace_id: String,
}
