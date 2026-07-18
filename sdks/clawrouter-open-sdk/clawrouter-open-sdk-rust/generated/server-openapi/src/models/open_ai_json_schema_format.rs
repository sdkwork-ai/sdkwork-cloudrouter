use serde::{Deserialize, Serialize};

use crate::models::{OpenAiJsonSchema};

/// OpenAI-compatible open ai json schema format schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiJsonSchemaFormat {
    /// Description of the JSON schema response format.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// JSON schema response format name.
    pub name: String,

    /// Schema field on the open ai json schema format, using the open ai json schema module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema: Option<OpenAiJsonSchema>,

    /// Whether strict JSON schema adherence is requested.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strict: Option<bool>,
}
