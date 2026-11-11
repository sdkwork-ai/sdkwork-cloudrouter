use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to add items to a conversation (`POST /v1/conversations/{conversation_id}/items`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationItemCreateRequest {
    /// Items to add to the conversation.
    pub items: Vec<std::collections::HashMap<String, String>>,
}
