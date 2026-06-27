use serde::{Deserialize, Serialize};

/// OpenAI-compatible realtime call object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCall {
    /// Unix timestamp in seconds when the call was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Realtime call identifier.
    pub id: String,

    /// Developer-defined realtime call metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally realtime.call.
    pub object: String,

    /// WebRTC SDP payload when returned as JSON.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sdp: Option<String>,

    /// Realtime session object associated with the call.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session: Option<String>,

    /// Realtime call lifecycle status.
    pub status: String,
}
