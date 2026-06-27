use serde::{Deserialize, Serialize};

use crate::models::OpenAiJsonSchemaFormat;

/// OpenAI-compatible open ai response format schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseFormat {
    /// Json schema field on the open ai response format, using the open ai json schema format module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub json_schema: Option<OpenAiJsonSchemaFormat>,

    /// Requested response format type.
    pub r#type: String,
}
