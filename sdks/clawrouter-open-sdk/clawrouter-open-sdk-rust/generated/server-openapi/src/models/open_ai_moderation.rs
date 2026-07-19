use serde::{Deserialize, Serialize};

use crate::models::OpenAiModerationResult;

/// OpenAI-compatible moderation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiModeration {
    /// Moderation response identifier.
    pub id: String,

    /// Moderation model used by the upstream.
    pub model: String,

    /// Moderation classification results.
    pub results: Vec<OpenAiModerationResult>,
}
