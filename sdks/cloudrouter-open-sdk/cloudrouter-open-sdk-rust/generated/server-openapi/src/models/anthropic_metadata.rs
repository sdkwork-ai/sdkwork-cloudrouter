use serde::{Deserialize, Serialize};

/// Anthropic request metadata.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicMetadata {
    /// Opaque end-user identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
}
