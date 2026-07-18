use serde::{Deserialize, Serialize};

use crate::models::{ViduCreation};

/// Vidu vidu image generation task schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduImageGenerationTask {
    /// Task creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Generated media records when included by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub creations: Option<Vec<ViduCreation>>,

    /// Vidu model used by the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Vidu task state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,

    /// Vidu image task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,
}
