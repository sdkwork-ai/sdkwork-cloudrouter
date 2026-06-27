use serde::{Deserialize, Serialize};

use crate::models::OpenAiConversationContentPart;

/// OpenAI-compatible open ai conversation item create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationItemCreateRequest {
    /// Text or multimodal content parts for the item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<OpenAiConversationContentPart>>,

    /// Developer-defined metadata attached to the item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Message role when the item represents a message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Conversation item type, such as message, reasoning, tool_call, or provider-specific item type.
    pub r#type: String,
}
