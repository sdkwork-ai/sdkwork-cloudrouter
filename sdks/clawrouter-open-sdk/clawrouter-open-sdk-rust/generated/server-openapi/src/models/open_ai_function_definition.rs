use serde::{Deserialize, Serialize};

use crate::models::{OpenAiJsonSchema};

/// OpenAI-compatible open ai function definition schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFunctionDefinition {
    /// Function description visible to the model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Function name visible to the model.
    pub name: String,

    /// Parameters field on the open ai function definition, using the open ai json schema module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameters: Option<OpenAiJsonSchema>,

    /// Whether strict JSON Schema adherence is requested.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub strict: Option<bool>,
}
