use serde::{Deserialize, Serialize};

/// Anthropic Claude anthropic count message tokens response schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicCountMessageTokensResponse {
    /// Total input token count.
    pub input_tokens: i64,
}
