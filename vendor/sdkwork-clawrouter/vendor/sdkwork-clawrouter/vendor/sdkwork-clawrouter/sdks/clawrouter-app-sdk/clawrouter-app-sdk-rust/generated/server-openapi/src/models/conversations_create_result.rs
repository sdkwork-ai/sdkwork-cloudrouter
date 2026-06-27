use serde::{Deserialize, Serialize};

use crate::models::{ChatConversationResponse};

/// Conversations create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ConversationsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on conversations create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ChatConversationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
