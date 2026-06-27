use serde::{Deserialize, Serialize};

/// Chat message item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatMessageItem {
    /// Content field on chat message item.
    pub content: String,

    /// Conversation id field on chat message item.
    #[serde(rename = "conversationId")]
    pub conversation_id: String,

    /// Created at field on chat message item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Direction field on chat message item.
    pub direction: String,

    /// Id field on chat message item.
    pub id: String,

    /// Model field on chat message item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Provider field on chat message item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,

    /// Role field on chat message item.
    pub role: String,

    /// Runtime field on chat message item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime: Option<String>,

    /// Runtime invocation id field on chat message item.
    #[serde(rename = "runtimeInvocationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime_invocation_id: Option<String>,

    /// Status field on chat message item.
    pub status: String,

    /// Turn id field on chat message item.
    #[serde(rename = "turnId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub turn_id: Option<String>,

    /// Usage field on chat message item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<serde_json::Value>,

    /// Usage link id field on chat message item.
    #[serde(rename = "usageLinkId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_link_id: Option<String>,
}
