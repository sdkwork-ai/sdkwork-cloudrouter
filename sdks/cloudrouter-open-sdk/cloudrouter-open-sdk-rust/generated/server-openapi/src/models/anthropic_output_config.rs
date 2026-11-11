use serde::{Deserialize, Serialize};

use crate::models::{AnthropicOutputFormat};

/// Anthropic output configuration.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicOutputConfig {
    /// Reasoning effort level.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effort: Option<String>,

    /// Structured output format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub format: Option<AnthropicOutputFormat>,
}
