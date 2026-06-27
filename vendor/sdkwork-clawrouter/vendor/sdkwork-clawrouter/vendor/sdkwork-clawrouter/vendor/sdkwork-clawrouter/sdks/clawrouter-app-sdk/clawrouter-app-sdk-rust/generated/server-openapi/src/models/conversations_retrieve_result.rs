use serde::{Deserialize, Serialize};

use crate::models::{ChatConversationItem};

/// Conversations retrieve result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ConversationsRetrieveResult {
    /// Business response code.
    pub code: String,

    /// Data field on conversations retrieve result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ChatConversationItem>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
