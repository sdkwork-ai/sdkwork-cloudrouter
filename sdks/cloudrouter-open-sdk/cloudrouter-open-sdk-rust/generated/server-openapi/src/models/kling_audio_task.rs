use serde::{Deserialize, Serialize};

/// Kling sound-effect task (text-to-audio / video-to-audio) and its status.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingAudioTask {
    /// Kling business status code; 0 means accepted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<i64>,

    /// Task envelope: task_id, task_status, task_status_msg, task_info, created_at, updated_at.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<std::collections::HashMap<String, String>>,

    /// Kling status message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Kling request identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}
