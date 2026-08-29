use serde::{Deserialize, Serialize};

use crate::models::{OpenAiBatchRequestCounts};

/// OpenAI-compatible batch object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiBatch {
    /// Unix timestamp in seconds when the batch was cancelled.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cancelled_at: Option<i64>,

    /// Unix timestamp in seconds when cancellation started.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cancelling_at: Option<i64>,

    /// Unix timestamp in seconds when the batch completed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,

    /// Time window in which the batch should be processed.
    pub completion_window: String,

    /// Unix timestamp in seconds when the batch was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Endpoint processed by the batch.
    pub endpoint: String,

    /// Error file identifier produced by the batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_file_id: Option<String>,

    /// Batch error list or envelope when returned.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub errors: Option<String>,

    /// Unix timestamp in seconds when the batch expired.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expired_at: Option<i64>,

    /// Unix timestamp in seconds when the batch expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// Unix timestamp in seconds when the batch failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failed_at: Option<i64>,

    /// Unix timestamp in seconds when the batch started finalizing.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finalizing_at: Option<i64>,

    /// Batch identifier.
    pub id: String,

    /// Unix timestamp in seconds when the batch started.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub in_progress_at: Option<i64>,

    /// Input file identifier containing batch requests.
    pub input_file_id: String,

    /// Developer-defined batch metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally batch.
    pub object: String,

    /// Output file identifier produced by the batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_file_id: Option<String>,

    /// Request counts field on the open ai batch, using the open ai batch request counts module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_counts: Option<OpenAiBatchRequestCounts>,

    /// Batch processing status.
    pub status: String,
}
