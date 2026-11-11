use serde::{Deserialize, Serialize};

/// Jimeng video generation task and its generated video.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct JimengVideoGenerationTask {
    /// Task creation timestamp in Unix seconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Task error envelope with code and message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<std::collections::HashMap<String, String>>,

    /// Jimeng task identifier when the provider echoes it under id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Task status, for example queued, running, or succeeded.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Jimeng task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Generated video URL once the task succeeded.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
}
