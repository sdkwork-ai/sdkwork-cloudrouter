use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai conversation reference schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationReference {
    /// Conversation identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
}
