use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai response input tokens details schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseInputTokensDetails {
    /// Input tokens served from cache.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cached_tokens: Option<i64>,
}
