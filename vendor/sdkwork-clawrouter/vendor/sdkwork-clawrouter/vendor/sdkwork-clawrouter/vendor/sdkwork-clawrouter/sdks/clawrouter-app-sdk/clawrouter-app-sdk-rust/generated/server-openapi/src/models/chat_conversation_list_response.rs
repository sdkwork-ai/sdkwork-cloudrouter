use serde::{Deserialize, Serialize};

use crate::models::{ChatConversationItem};

/// Chat conversation list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatConversationListResponse {
    /// Items field on chat conversation list response.
    pub items: Vec<ChatConversationItem>,
}
