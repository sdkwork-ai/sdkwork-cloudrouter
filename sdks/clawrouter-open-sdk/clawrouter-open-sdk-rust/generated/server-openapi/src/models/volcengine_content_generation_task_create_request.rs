use serde::{Deserialize, Serialize};

use crate::models::{VolcengineContentPart};

/// Volcengine Ark volcengine content generation task create request schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VolcengineContentGenerationTaskCreateRequest {
    /// Optional callback URL.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Input content parts for image, video, or multimodal generation.
    pub content: Vec<VolcengineContentPart>,

    /// Metadata field on the volcengine content generation task create request, using the provider metadata module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Volcengine Ark content generation model identifier.
    pub model: String,
}
