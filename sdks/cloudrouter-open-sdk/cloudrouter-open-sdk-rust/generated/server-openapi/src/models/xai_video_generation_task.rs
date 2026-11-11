use serde::{Deserialize, Serialize};

use crate::models::{XaiUsage, XaiVideoUrl};

/// xAI video task result (VideoResponse): poll GET /xai/v1/videos/{request_id}.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct XaiVideoGenerationTask {
    /// Failure body returned when the task failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<std::collections::HashMap<String, String>>,

    /// The model used to generate the video; omitted when status is failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Approximate completion percentage (0-100).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub progress: Option<i64>,

    /// The polled request id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// Status of the video generation: done when the video is ready.
    pub status: String,

    /// Usage field on the xai video generation task, using the xai usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<XaiUsage>,

    /// Video field on the xai video generation task, using the xai video url module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video: Option<XaiVideoUrl>,
}
