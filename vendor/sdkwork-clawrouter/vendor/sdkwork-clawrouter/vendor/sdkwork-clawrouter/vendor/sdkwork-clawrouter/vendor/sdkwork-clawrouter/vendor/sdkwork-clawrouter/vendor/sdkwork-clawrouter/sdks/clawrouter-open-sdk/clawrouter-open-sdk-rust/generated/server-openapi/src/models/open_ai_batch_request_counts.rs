use serde::{Deserialize, Serialize};

/// Batch request processing counters.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiBatchRequestCounts {
    /// Number of completed requests.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed: Option<i64>,

    /// Number of failed requests.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failed: Option<i64>,

    /// Total number of requests in the batch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total: Option<i64>,
}
