use serde::{Deserialize, Serialize};

use crate::models::OpenAiAnnotation;

/// OpenAI-compatible open ai response output content schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiResponseOutputContent {
    /// Annotations attached to the output text.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub annotations: Option<Vec<OpenAiAnnotation>>,

    /// Refusal text emitted by refusal content parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub refusal: Option<String>,

    /// Text emitted by output_text content parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    /// Output content type.
    pub r#type: String,
}
