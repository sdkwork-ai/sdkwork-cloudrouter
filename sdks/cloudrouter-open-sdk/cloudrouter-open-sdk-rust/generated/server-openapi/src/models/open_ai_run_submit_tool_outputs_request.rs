use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to submit tool outputs for a run.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRunSubmitToolOutputsRequest {
    /// Whether to stream run events after submitting tool outputs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,

    /// Tool outputs submitted to continue the run.
    pub tool_outputs: Vec<String>,
}
