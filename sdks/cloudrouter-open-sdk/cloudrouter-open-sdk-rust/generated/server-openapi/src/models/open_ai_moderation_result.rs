use serde::{Deserialize, Serialize};

/// Single OpenAI-compatible moderation classification result.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiModerationResult {
    /// Boolean category flags returned by the moderation model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub categories: Option<std::collections::HashMap<String, String>>,

    /// Moderation category scores keyed by category name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category_scores: Option<std::collections::HashMap<String, f64>>,

    /// Whether the input was flagged by moderation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub flagged: Option<bool>,
}
