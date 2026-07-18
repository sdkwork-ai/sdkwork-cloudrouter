use serde::{Deserialize, Serialize};

use crate::models::{OpenAiImageReferenceInput};

/// OpenAI-compatible open ai image variation request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiImageVariationRequest {
    /// Image field on the open ai image variation request, using the open ai image reference input module.
    pub image: OpenAiImageReferenceInput,

    /// Image variation model id or Claw Router catalog key.
    pub model: String,

    /// Requested image size.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
}
