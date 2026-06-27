use serde::{Deserialize, Serialize};

use crate::models::{ProviderGeneratedMedia, ProviderTaskError};

/// Nano Banana compatible nano banana image generation task schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NanoBananaImageGenerationTask {
    /// Task creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Error field on the midjourney image generation task, using the provider task error module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ProviderTaskError>,

    /// Provider task or image identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Generated image assets.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<ProviderGeneratedMedia>>,

    /// Model used for generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Prompt used for generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Provider task state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Provider image generation task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Task update timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}
