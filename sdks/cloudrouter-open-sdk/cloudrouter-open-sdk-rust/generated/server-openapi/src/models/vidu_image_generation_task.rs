use serde::{Deserialize, Serialize};

use crate::models::{ViduCreation};

/// Vidu vidu image generation task schema exposed by Cloud Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViduImageGenerationTask {
    /// Requested aspect ratio echoed back by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,

    /// Callback URL echoed back by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub callback_url: Option<String>,

    /// Task creation timestamp.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Generated media records when included by Vidu.
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

    /// Images echoed back by Vidu for the image task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,

    /// Vidu model used by the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Whether off-peak mode was used.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub off_peak: Option<bool>,

    /// Opaque payload echoed back by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payload: Option<String>,

    /// Prompt echoed back by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,

    /// Requested resolution echoed back by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resolution: Option<String>,

    /// Seed used by Vidu.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,

    /// Vidu task state.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,

    /// Vidu image task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Whether the task requested a watermark.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub watermark: Option<bool>,
}
