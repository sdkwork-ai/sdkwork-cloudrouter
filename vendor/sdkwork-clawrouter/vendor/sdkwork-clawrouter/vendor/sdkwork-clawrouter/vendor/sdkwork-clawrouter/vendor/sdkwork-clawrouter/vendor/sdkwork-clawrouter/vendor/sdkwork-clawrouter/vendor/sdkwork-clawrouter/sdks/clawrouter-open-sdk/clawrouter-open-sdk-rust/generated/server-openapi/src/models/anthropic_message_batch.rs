use serde::{Deserialize, Serialize};

use crate::models::AnthropicMessageBatchRequestCounts;

/// Anthropic Claude anthropic message batch schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessageBatch {
    /// Time cancellation began.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cancel_initiated_at: Option<String>,

    /// Time the batch was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Time the batch ended.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ended_at: Option<String>,

    /// Time the batch expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,

    /// Message batch identifier.
    pub id: String,

    /// Batch processing status.
    pub processing_status: String,

    /// Request counts field on the anthropic message batch, using the anthropic message batch request counts module.
    pub request_counts: AnthropicMessageBatchRequestCounts,

    /// URL for batch results when available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub results_url: Option<String>,

    /// Object type, always message_batch.
    pub r#type: String,
}
