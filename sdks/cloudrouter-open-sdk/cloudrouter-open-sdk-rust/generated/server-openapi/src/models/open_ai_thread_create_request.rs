use serde::{Deserialize, Serialize};

use crate::models::{OpenAiThreadMessageCreateRequest};

/// OpenAI-compatible request to create a thread.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiThreadCreateRequest {
    /// Initial messages to add to the thread.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<OpenAiThreadMessageCreateRequest>>,

    /// Developer-defined thread metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Resources available to assistant tools.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_resources: Option<String>,
}
