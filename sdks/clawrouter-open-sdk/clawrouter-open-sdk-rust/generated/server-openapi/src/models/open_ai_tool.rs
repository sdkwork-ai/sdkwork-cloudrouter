use serde::{Deserialize, Serialize};

use crate::models::{OpenAiFunctionDefinition};

/// OpenAI-compatible open ai tool schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiTool {
    /// Function field on the open ai tool, using the open ai function definition module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function: Option<OpenAiFunctionDefinition>,

    /// Tool type, commonly function.
    pub r#type: String,
}
