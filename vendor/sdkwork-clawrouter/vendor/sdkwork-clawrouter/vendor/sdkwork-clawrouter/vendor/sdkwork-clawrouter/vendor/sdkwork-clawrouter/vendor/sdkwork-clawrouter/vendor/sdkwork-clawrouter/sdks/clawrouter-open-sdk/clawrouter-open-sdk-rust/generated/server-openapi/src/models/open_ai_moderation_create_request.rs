use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to classify text or multimodal input for moderation.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiModerationCreateRequest {
    /// Text or multimodal input to classify.
    pub input: String,

    /// Moderation model id or Claw Router catalog key.
    pub model: String,
}
