use serde::{Deserialize, Serialize};

use crate::models::KlingImageTaskResult;

/// Kling image task record.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct KlingImageTaskData {
    /// Creation time as a Unix timestamp in milliseconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Kling task id.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Creation parameters echoed back by Kling.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_info: Option<std::collections::HashMap<String, String>>,

    /// Generated images; present once the task succeeds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_result: Option<KlingImageTaskResult>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_status: Option<String>,

    /// Failure reason or status detail.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_status_msg: Option<String>,

    /// Last update time as a Unix timestamp in milliseconds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
}
