use serde::{Deserialize, Serialize};

use crate::models::{ProviderGeneratedMedia};

/// DashScope asynchronous task record shared by task submission and task polling.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaAsyncTask {
    /// DashScope task error code.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// Completion time formatted as `YYYY-MM-DD HH:mm:ss.SSS`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_time: Option<String>,

    /// DashScope task error message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Prompt actually used for generation after prompt extension.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub orig_prompt: Option<String>,

    /// Generated image records returned by image tasks.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub results: Option<Vec<ProviderGeneratedMedia>>,

    /// Execution start time formatted as `YYYY-MM-DD HH:mm:ss.SSS`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scheduled_time: Option<String>,

    /// Submission time formatted as `YYYY-MM-DD HH:mm:ss.SSS`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub submit_time: Option<String>,

    /// DashScope asynchronous task identifier, valid for 24 hours.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,

    /// Task status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task_status: Option<String>,

    /// Generated video URL; returned only when the task succeeded and valid for 24 hours.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub video_url: Option<String>,
}
