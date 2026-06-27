use serde::{Deserialize, Serialize};

use crate::models::OpenAiFunctionCall;

/// OpenAI-compatible open ai tool call schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiToolCall {
    /// Function field on the open ai tool call, using the open ai function call module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function: Option<OpenAiFunctionCall>,

    /// Tool call identifier.
    pub id: String,

    /// Tool call type, commonly function.
    pub r#type: String,
}
