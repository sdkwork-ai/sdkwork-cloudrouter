use serde::{Deserialize, Serialize};

use crate::models::{AlibabaAsyncTask, AlibabaTaskUsage};

/// Alibaba DashScope asynchronous video task submission acknowledgement.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaVideoGenerationResponse {
    /// DashScope business error code when the submission failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// DashScope business error message when the submission failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Submitted asynchronous task record.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<AlibabaAsyncTask>,

    /// DashScope request identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// DashScope usage block for the submitted task.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<AlibabaTaskUsage>,
}
