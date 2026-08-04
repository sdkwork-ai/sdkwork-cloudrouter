use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create or start a realtime call.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCallCreateRequest {
    /// Developer-defined realtime call metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// WebRTC SDP offer.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sdp: Option<String>,

    /// Realtime session configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session: Option<String>,
}
