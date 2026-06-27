use serde::{Deserialize, Serialize};

use crate::models::{ProviderGeneratedMedia, ProviderTaskError};

/// Kling-compatible kling video generation task schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingVideoGenerationTask {
    /// Task creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Error field on the kling video generation task, using the provider task error module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<ProviderTaskError>,

    /// Provider task or video identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

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

    /// Provider video generation task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Task update timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,

    /// Generated video assets.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub videos: Option<Vec<ProviderGeneratedMedia>>,
}
