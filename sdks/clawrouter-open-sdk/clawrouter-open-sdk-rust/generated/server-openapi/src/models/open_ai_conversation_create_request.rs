use serde::{Deserialize, Serialize};

use crate::models::OpenAiConversationItemCreateRequest;

/// OpenAI-compatible open ai conversation create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationCreateRequest {
    /// Initial input items to add to the conversation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub items: Option<Vec<OpenAiConversationItemCreateRequest>>,

    /// Developer-defined metadata attached to the conversation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,
}
