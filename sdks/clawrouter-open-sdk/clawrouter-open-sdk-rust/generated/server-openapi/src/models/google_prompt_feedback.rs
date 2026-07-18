use serde::{Deserialize, Serialize};

use crate::models::{GoogleSafetyRating};

/// Google Gemini google prompt feedback schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GooglePromptFeedback {
    /// Reason the prompt was blocked.
    #[serde(rename = "blockReason")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block_reason: Option<String>,

    /// Prompt safety ratings.
    #[serde(rename = "safetyRatings")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_ratings: Option<Vec<GoogleSafetyRating>>,
}
