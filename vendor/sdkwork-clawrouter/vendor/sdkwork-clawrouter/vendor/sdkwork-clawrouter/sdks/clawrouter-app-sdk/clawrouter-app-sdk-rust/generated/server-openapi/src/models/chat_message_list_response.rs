use serde::{Deserialize, Serialize};

use crate::models::{ChatMessageItem};

/// Chat message list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatMessageListResponse {
    /// Items field on chat message list response.
    pub items: Vec<ChatMessageItem>,
}
