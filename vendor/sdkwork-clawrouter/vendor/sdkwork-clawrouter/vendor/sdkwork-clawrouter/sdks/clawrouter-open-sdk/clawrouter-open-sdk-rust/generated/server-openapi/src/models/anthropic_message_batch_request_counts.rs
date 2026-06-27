use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic message batch request counts schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessageBatchRequestCounts {
    /// Requests that were canceled.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub canceled: Option<i64>,

    /// Requests that errored.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub errored: Option<i64>,

    /// Requests that expired.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expired: Option<i64>,

    /// Requests still processing.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub processing: Option<i64>,

    /// Requests that succeeded.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub succeeded: Option<i64>,
}
