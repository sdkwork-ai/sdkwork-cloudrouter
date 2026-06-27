use serde::{Deserialize, Serialize};

/// Chat turn create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatTurnCreateRequest {
    /// Agent id field on chat turn create request.
    #[serde(rename = "agentId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,

    /// Agent session id field on chat turn create request.
    #[serde(rename = "agentSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_session_id: Option<String>,

    /// Message field on chat turn create request.
    pub message: String,

    /// Metadata field on chat turn create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Mode field on chat turn create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,

    /// Model field on chat turn create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider field on chat turn create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,
}
