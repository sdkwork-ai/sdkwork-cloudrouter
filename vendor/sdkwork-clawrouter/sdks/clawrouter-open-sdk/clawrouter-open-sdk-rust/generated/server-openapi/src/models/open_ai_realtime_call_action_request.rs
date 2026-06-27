use serde::{Deserialize, Serialize};

/// OpenAI-compatible request for a realtime call action.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRealtimeCallActionRequest {
    /// Developer-defined realtime call action metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
