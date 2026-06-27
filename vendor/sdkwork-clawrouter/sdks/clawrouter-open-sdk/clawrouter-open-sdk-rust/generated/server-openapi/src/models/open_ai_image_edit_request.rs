use serde::{Deserialize, Serialize};

use crate::models::{OpenAiImageReferenceInput, OpenAiImageReferenceInputList};

/// OpenAI-compatible open ai image edit request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageEditRequest {
    /// Image field on the open ai image edit request, using the open ai image reference input list module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<OpenAiImageReferenceInputList>,

    /// Mask field on the open ai image edit request, using the open ai image reference input module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mask: Option<OpenAiImageReferenceInput>,

    /// Image edit model id or Claw Router catalog key.
    pub model: String,

    /// Text prompt describing the edit.
    pub prompt: String,
}
