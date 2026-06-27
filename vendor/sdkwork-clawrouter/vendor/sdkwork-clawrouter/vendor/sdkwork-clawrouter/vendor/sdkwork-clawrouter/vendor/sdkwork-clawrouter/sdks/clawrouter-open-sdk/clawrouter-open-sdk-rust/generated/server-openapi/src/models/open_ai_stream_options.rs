use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai stream options schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiStreamOptions {
    /// Whether the final stream event should include token usage.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub include_usage: Option<bool>,
}
