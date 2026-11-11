use serde::{Deserialize, Serialize};

use crate::models::{ProviderJsonSchema};

/// Anthropic JSON output format.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AnthropicOutputFormat {
    /// Schema field on the anthropic output format, using the provider json schema module.
    pub schema: ProviderJsonSchema,

    /// Output format type.
    pub r#type: String,
}
