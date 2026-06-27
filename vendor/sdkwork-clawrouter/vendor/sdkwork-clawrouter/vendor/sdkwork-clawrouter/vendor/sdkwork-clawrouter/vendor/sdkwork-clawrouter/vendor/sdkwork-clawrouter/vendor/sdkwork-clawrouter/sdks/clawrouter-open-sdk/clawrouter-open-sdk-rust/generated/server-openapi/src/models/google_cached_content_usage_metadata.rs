use serde::{Deserialize, Serialize};

/// Google Gemini google cached content usage metadata schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleCachedContentUsageMetadata {
    /// Total token count stored in the cache.
    #[serde(rename = "totalTokenCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_token_count: Option<i64>,
}
