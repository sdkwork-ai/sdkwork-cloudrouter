use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a thread message.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiThreadMessageCreateRequest {
    /// Message file or tool attachments.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<String>>,

    /// Message content as text or structured content parts.
    pub content: String,

    /// Developer-defined message metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Message role.
    pub role: String,
}
