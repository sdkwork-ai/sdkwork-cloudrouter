use serde::{Deserialize, Serialize};

/// Anthropic request diagnostics.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicDiagnostics {
    /// Previous `msg_...` id used to explain prompt-cache divergence.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub previous_message_id: Option<String>,
}
