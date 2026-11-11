use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to refer or transfer a realtime call.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCallReferRequest {
    /// SIP URI to transfer the call to.
    pub target_uri: String,
}
