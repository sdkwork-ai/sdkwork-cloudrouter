use serde::{Deserialize, Serialize};

use crate::models::{AnthropicMessageBatchRequest};

/// Anthropic Claude anthropic message batch create request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessageBatchCreateRequest {
    /// Message requests to execute as a batch.
    pub requests: Vec<AnthropicMessageBatchRequest>,
}
