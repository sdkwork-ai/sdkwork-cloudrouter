use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai conversation schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversation {
    /// Unix timestamp in seconds when the conversation was created.
    pub created_at: i64,

    /// Conversation identifier.
    pub id: String,

    /// Developer-defined metadata attached to the conversation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, always conversation.
    pub object: String,
}
