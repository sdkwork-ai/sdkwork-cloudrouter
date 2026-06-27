use serde::{Deserialize, Serialize};

use crate::models::OpenAiTokenUsage;

/// Item module returned inside the listAssistants list response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListAssistantsItem {
    /// Message or item content returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Resource identifier returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Developer-defined or provider-returned metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model id used by the response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// OpenAI-compatible object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Output items returned by the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<Vec<String>>,

    /// Message role when the object represents a message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Current resource status when returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Usage field on the list assistants item, using the open ai token usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<OpenAiTokenUsage>,
}
