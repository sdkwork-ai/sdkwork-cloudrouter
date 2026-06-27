use serde::{Deserialize, Serialize};

use crate::models::OpenAiConversation;

/// OpenAI-compatible open ai conversation list schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationList {
    /// Conversation objects in the requested page.
    pub data: Vec<OpenAiConversation>,

    /// Identifier of the first object in the page.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_id: Option<String>,

    /// Whether additional pages are available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,

    /// Identifier of the last object in the page.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_id: Option<String>,

    /// Object type, always list.
    pub object: String,
}
