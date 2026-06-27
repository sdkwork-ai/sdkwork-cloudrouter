use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to refer or transfer a realtime call.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCallReferRequest {
    /// Developer-defined realtime call action metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Refer target, SIP URI, phone number, or provider-specific target.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
}
