use serde::{Deserialize, Serialize};

/// Runtime event item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeEventItem {
    /// Created at field on runtime event item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Event no field on runtime event item.
    #[serde(rename = "eventNo")]
    pub event_no: String,

    /// Event source field on runtime event item.
    #[serde(rename = "eventSource")]
    pub event_source: String,

    /// Event type field on runtime event item.
    #[serde(rename = "eventType")]
    pub event_type: String,

    /// Id field on runtime event item.
    pub id: String,

    /// Invocation id field on runtime event item.
    #[serde(rename = "invocationId")]
    pub invocation_id: String,

    /// Payload json field on runtime event item.
    #[serde(rename = "payloadJson")]
    pub payload_json: std::collections::HashMap<String, String>,

    /// Text delta field on runtime event item.
    #[serde(rename = "textDelta")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text_delta: Option<String>,
}
