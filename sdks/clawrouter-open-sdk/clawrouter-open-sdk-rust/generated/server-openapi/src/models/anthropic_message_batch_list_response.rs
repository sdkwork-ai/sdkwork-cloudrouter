use serde::{Deserialize, Serialize};

use crate::models::{AnthropicMessageBatch};

/// Anthropic Claude anthropic message batch list response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessageBatchListResponse {
    /// Message batch objects.
    pub data: Vec<AnthropicMessageBatch>,

    /// First object identifier in the page.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_id: Option<String>,

    /// Whether more results are available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,

    /// Last object identifier in the page.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_id: Option<String>,
}
