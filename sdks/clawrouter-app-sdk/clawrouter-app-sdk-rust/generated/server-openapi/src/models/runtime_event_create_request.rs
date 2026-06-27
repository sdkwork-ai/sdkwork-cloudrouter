use serde::{Deserialize, Serialize};

/// Runtime event create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeEventCreateRequest {
    /// Event source field on runtime event create request.
    #[serde(rename = "eventSource")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub event_source: Option<String>,

    /// Event type field on runtime event create request.
    #[serde(rename = "eventType")]
    pub event_type: String,

    /// Metadata field on runtime event create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Payload json field on runtime event create request.
    #[serde(rename = "payloadJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload_json: Option<std::collections::HashMap<String, String>>,

    /// Text delta field on runtime event create request.
    #[serde(rename = "textDelta")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text_delta: Option<String>,
}
