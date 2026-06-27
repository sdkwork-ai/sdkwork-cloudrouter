use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai prompt tokens details schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiPromptTokensDetails {
    /// Number of input audio tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio_tokens: Option<i64>,

    /// Number of input tokens served from cache.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cached_tokens: Option<i64>,
}
