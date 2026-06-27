use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai conversation update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationUpdateRequest {
    /// Replacement metadata for the conversation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
