use serde::{Deserialize, Serialize};

use crate::models::ProviderJsonSchema;

/// Anthropic Claude anthropic tool schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicTool {
    /// Tool description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Input schema field on the anthropic tool, using the provider json schema module.
    pub input_schema: ProviderJsonSchema,

    /// Tool name.
    pub name: String,
}
