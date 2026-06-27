use serde::{Deserialize, Serialize};

/// Chat turn item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatTurnItem {
    /// Agent id field on chat turn item.
    #[serde(rename = "agentId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,

    /// Agent session id field on chat turn item.
    #[serde(rename = "agentSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_session_id: Option<String>,

    /// Conversation id field on chat turn item.
    #[serde(rename = "conversationId")]
    pub conversation_id: String,

    /// Created at field on chat turn item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Id field on chat turn item.
    pub id: String,

    /// Model field on chat turn item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider field on chat turn item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,

    /// Status field on chat turn item.
    pub status: String,

    /// Updated at field on chat turn item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
