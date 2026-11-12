use serde::{Deserialize, Serialize};

use crate::models::ViduCreation;

/// Vidu vidu audio generation task schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduAudioGenerationTask {
    /// Task creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Generated audio records when included by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub creations: Option<Vec<ViduCreation>>,

    /// Credits consumed by the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub credits: Option<i64>,

    /// Requested duration echoed back by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration: Option<i64>,

    /// Vidu error code when the task failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub err_code: Option<String>,

    /// Vidu audio model used by the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Prompt echoed back by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Seed used by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Vidu task state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,

    /// Vidu audio task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,
}
