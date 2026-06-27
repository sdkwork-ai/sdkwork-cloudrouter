use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai realtime call multipart request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCallMultipartRequest {
    /// WebRTC SDP offer.
    pub sdp: String,

    /// JSON-serialized realtime session configuration.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session: Option<String>,
}
