use serde::{Deserialize, Serialize};

use crate::models::{ChatMessageItem, ChatTurnItem};

/// Chat turn create response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ChatTurnCreateResponse {
    /// Messages field on chat turn create response.
    pub messages: Vec<ChatMessageItem>,

    /// Turn field on chat turn create response.
    pub turn: ChatTurnItem,
}
