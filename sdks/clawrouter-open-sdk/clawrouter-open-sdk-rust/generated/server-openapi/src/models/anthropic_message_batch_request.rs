use serde::{Deserialize, Serialize};

use crate::models::{AnthropicMessageCreateRequest};

/// Anthropic Claude anthropic message batch request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMessageBatchRequest {
    /// Caller-provided request identifier.
    pub custom_id: String,

    /// Params field on the anthropic message batch request, using the anthropic message create request module.
    pub params: AnthropicMessageCreateRequest,
}
