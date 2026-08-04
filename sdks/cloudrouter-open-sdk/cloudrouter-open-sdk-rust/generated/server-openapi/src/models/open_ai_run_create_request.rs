use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a thread run.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRunCreateRequest {
    /// Additional instructions appended for this run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub additional_instructions: Option<String>,

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

    /// Tool definitions available to the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,
}
