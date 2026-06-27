use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai reasoning config schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiReasoningConfig {
    /// Reasoning effort hint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effort: Option<String>,

    /// Reasoning summary behavior when supported.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
}
