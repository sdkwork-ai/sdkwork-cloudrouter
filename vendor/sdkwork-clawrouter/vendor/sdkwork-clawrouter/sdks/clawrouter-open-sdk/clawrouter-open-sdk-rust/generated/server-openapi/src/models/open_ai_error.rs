use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai error schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiError {
    /// Machine-readable error code.
    pub code: String,

    /// Human-readable error message.
    pub message: String,

    /// Request parameter related to the error when available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub param: Option<String>,

    /// Gateway path that produced the error when available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,

    /// OpenAI-compatible error type.
    pub r#type: String,
}
