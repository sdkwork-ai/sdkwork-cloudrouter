use serde::{Deserialize, Serialize};

use crate::models::{OpenAiConversationContentPart};

/// OpenAI-compatible open ai conversation item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationItem {
    /// Text or multimodal content parts for the item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<Vec<OpenAiConversationContentPart>>,

    /// Unix timestamp in seconds when the item was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Conversation item identifier.
    pub id: String,

    /// Developer-defined metadata attached to the item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, always conversation.item.
    pub object: String,

    /// Message role when the item represents a message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Provider item status when returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Conversation item type.
    pub r#type: String,
}
