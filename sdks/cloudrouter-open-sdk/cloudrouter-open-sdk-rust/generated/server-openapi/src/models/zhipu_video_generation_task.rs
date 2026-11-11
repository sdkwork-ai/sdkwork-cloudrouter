use serde::{Deserialize, Serialize};

use crate::models::{ZhipuImageResult, ZhipuVideoResult};

/// Zhipu asynchronous video/image generation result.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ZhipuVideoGenerationTask {
    /// Request creation time as a Unix timestamp in seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Asynchronous task id, present on the create response.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Generated image outputs for asynchronous image tasks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_result: Option<Vec<ZhipuImageResult>>,

    /// Model that served the task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Request id echoed back by the provider.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_status: Option<String>,

    /// Generated video outputs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_result: Option<Vec<ZhipuVideoResult>>,
}
