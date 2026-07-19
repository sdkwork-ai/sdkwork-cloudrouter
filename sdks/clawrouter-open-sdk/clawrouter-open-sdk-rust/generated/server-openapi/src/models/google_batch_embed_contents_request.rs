use serde::{Deserialize, Serialize};

use crate::models::GoogleEmbedContentRequest;

/// Google Gemini google batch embed contents request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleBatchEmbedContentsRequest {
    /// Embedding requests to run as a batch.
    pub requests: Vec<GoogleEmbedContentRequest>,
}
