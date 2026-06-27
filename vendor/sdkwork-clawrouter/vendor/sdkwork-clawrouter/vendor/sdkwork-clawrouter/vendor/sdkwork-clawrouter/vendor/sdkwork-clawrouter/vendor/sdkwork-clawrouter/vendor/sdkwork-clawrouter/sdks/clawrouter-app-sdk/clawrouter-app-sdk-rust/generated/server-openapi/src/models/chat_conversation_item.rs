use serde::{Deserialize, Serialize};

/// Chat conversation item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatConversationItem {
    /// Agent id field on chat conversation item.
    #[serde(rename = "agentId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,

    /// Agent session id field on chat conversation item.
    #[serde(rename = "agentSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_session_id: Option<String>,

    /// Created at field on chat conversation item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Default model field on chat conversation item.
    #[serde(rename = "defaultModel")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_model: Option<String>,

    /// Default provider field on chat conversation item.
    #[serde(rename = "defaultProvider")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_provider: Option<String>,

    /// Id field on chat conversation item.
    pub id: String,

    /// Last message preview field on chat conversation item.
    #[serde(rename = "lastMessagePreview")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_message_preview: Option<String>,

    /// Memory space id field on chat conversation item.
    #[serde(rename = "memorySpaceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memory_space_id: Option<String>,

    /// Message count field on chat conversation item.
    #[serde(rename = "messageCount")]
    pub message_count: String,

    /// Source surface field on chat conversation item.
    #[serde(rename = "sourceSurface")]
    pub source_surface: String,

    /// Status field on chat conversation item.
    pub status: String,

    /// Title field on chat conversation item.
    pub title: String,

    /// Turn count field on chat conversation item.
    #[serde(rename = "turnCount")]
    pub turn_count: String,

    /// Updated at field on chat conversation item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
