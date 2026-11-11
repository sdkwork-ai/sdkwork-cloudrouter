use serde::{Deserialize, Serialize};

use crate::models::{AlibabaAsyncTask, AlibabaTaskUsage};

/// Alibaba DashScope asynchronous task status and its generated video.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaVideoGenerationTask {
    /// Current asynchronous task record.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<AlibabaAsyncTask>,

    /// DashScope request identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// Usage counters returned once the task succeeds.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<AlibabaTaskUsage>,
}
