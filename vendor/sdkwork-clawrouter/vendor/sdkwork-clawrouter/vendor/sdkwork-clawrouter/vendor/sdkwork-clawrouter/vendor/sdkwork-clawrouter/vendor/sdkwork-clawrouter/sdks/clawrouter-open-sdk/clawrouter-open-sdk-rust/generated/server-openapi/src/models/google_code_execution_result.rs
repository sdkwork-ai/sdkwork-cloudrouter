use serde::{Deserialize, Serialize};

/// Google Gemini google code execution result schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCodeExecutionResult {
    /// Code execution outcome.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub outcome: Option<String>,

    /// Code execution output.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
}
