use serde::{Deserialize, Serialize};

use crate::models::{OpenAiConversationItem};

/// OpenAI-compatible open ai conversation item list schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiConversationItemList {
    /// Conversation items in the requested page.
    pub data: Vec<OpenAiConversationItem>,

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
