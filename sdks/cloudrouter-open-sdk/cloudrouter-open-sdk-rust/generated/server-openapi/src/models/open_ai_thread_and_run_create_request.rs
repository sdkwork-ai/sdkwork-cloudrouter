use serde::{Deserialize, Serialize};

use crate::models::{OpenAiThreadCreateRequest};

/// OpenAI-compatible request to create a thread and start a run.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiThreadAndRunCreateRequest {
    /// Assistant identifier used by the run.
    pub assistant_id: String,

    /// Instructions applied to the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Developer-defined run metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model override used by the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Whether to stream run events.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Thread field on the open ai thread and run create request, using the open ai thread create request module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thread: Option<OpenAiThreadCreateRequest>,

    /// Tool definitions available to the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,
}
