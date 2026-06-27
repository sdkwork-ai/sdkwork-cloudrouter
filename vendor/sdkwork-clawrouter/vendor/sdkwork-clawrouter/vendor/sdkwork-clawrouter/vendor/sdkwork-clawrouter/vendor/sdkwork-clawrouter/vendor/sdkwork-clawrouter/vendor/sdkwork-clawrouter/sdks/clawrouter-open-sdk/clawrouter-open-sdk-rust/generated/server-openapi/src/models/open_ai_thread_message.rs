use serde::{Deserialize, Serialize};

/// OpenAI-compatible thread message object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiThreadMessage {
    /// Assistant identifier associated with the message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assistant_id: Option<String>,

    /// Message file or tool attachments.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<String>>,

    /// Unix timestamp in seconds when the message completed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,

    /// Message content parts.
    pub content: Vec<String>,

    /// Unix timestamp in seconds when the message was created.
    pub created_at: i64,

    /// Message identifier.
    pub id: String,

    /// Unix timestamp in seconds when the message became incomplete.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub incomplete_at: Option<i64>,

    /// Details explaining why a message is incomplete.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub incomplete_details: Option<String>,

    /// Developer-defined message metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally thread.message.
    pub object: String,

    /// Message role.
    pub role: String,

    /// Run identifier associated with the message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run_id: Option<String>,

    /// Message processing status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Thread identifier that owns the message.
    pub thread_id: String,
}
