use serde::{Deserialize, Serialize};

use crate::models::{ChatMessageListResponse};

/// Conversation messages list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ConversationMessagesListResult {
    /// Business response code.
    pub code: String,

    /// Data field on conversation messages list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ChatMessageListResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
