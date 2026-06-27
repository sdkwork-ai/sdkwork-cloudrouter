use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai response error schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseError {
    /// Response error code.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// Human-readable response error message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Parameter related to the response error.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub param: Option<String>,

    /// Response error type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
