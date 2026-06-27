use std::sync::Mutex;

use axum::body::Body;

#[derive(Debug, Clone, Default, PartialEq)]
pub struct InvocationTelemetry {
    pub trace_id: Option<String>,
    pub latency_ms: Option<i64>,
    pub ttft_ms: Option<i64>,
    pub provider_error_code: Option<String>,
    pub error_type: Option<String>,
    pub error_message_masked: Option<String>,
    pub normalized_response: Option<InvocationNormalizedResponse>,
}

#[derive(Debug)]
pub struct InvocationNormalizedResponse {
    pub status_code: u16,
    pub body: Option<serde_json::Value>,
    pub body_bytes: Option<Vec<u8>>,
    pub content_type: Option<String>,
    /// Streaming response body. Wrapped in Mutex for Sync safety.
    pub stream_body: Mutex<Option<Body>>,
}

impl Clone for InvocationNormalizedResponse {
    fn clone(&self) -> Self {
        Self {
            status_code: self.status_code,
            body: self.body.clone(),
            body_bytes: self.body_bytes.clone(),
            content_type: self.content_type.clone(),
            stream_body: Mutex::new(None),
        }
    }
}

impl PartialEq for InvocationNormalizedResponse {
    fn eq(&self, other: &Self) -> bool {
        self.status_code == other.status_code
            && self.body == other.body
            && self.body_bytes == other.body_bytes
            && self.content_type == other.content_type
    }
}
