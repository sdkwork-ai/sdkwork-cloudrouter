use serde::{Deserialize, Serialize};

use crate::models::{AlibabaAsyncTask, AlibabaTaskUsage};

/// Alibaba DashScope Wanx image task submission acknowledgement.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AlibabaImageGenerationResponse {
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

    /// DashScope usage block carrying the generated image count.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<AlibabaTaskUsage>,
}
