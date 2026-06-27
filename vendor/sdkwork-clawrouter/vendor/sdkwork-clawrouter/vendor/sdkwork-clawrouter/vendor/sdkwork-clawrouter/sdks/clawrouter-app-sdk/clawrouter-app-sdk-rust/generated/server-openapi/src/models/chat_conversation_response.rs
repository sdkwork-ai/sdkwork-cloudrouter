use serde::{Deserialize, Serialize};

use crate::models::{ChatConversationItem};

/// Chat conversation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatConversationResponse {
    /// Item field on chat conversation response.
    pub item: ChatConversationItem,
}
