use serde::{Deserialize, Serialize};

use crate::models::GoogleContentEmbedding;

/// Google Gemini google embed content response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleEmbedContentResponse {
    /// Embedding field on the google embed content response, using the google content embedding module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub embedding: Option<GoogleContentEmbedding>,
}
