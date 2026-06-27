use serde::{Deserialize, Serialize};

use crate::models::{GoogleCitationMetadata, GoogleContent, GoogleSafetyRating};

/// Google Gemini google candidate schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCandidate {
    /// Citation metadata field on the google candidate, using the google citation metadata module.
    #[serde(rename = "citationMetadata")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub citation_metadata: Option<GoogleCitationMetadata>,

    /// Content field on the google candidate, using the google content module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub content: Option<GoogleContent>,

    /// Reason generation stopped.
    #[serde(rename = "finishReason")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,

    /// Candidate index.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub index: Option<i64>,

    /// Safety ratings for the candidate.
    #[serde(rename = "safetyRatings")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_ratings: Option<Vec<GoogleSafetyRating>>,

    /// Candidate token count when supplied.
    #[serde(rename = "tokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_count: Option<i64>,
}
