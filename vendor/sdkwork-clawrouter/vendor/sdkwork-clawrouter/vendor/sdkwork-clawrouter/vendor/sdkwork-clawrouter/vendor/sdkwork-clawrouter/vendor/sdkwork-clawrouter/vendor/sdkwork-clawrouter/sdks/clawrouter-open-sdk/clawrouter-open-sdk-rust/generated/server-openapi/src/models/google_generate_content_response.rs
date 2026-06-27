use serde::{Deserialize, Serialize};

use crate::models::{GoogleCandidate, GooglePromptFeedback, GoogleUsageMetadata};

/// Google Gemini google generate content response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleGenerateContentResponse {
    /// Candidate responses returned by Gemini.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub candidates: Option<Vec<GoogleCandidate>>,

    /// Model version that generated the response.
    #[serde(rename = "modelVersion")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_version: Option<String>,

    /// Prompt feedback field on the google generate content response, using the google prompt feedback module.
    #[serde(rename = "promptFeedback")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_feedback: Option<GooglePromptFeedback>,

    /// Provider response identifier.
    #[serde(rename = "responseId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_id: Option<String>,

    /// Usage metadata field on the google generate content response, using the google usage metadata module.
    #[serde(rename = "usageMetadata")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_metadata: Option<GoogleUsageMetadata>,
}
