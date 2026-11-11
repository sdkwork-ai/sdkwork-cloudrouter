use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to reject an inbound realtime call.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCallRejectRequest {
    /// SIP status code used to reject the call.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_code: Option<i64>,
}
