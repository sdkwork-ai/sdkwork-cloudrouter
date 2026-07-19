use serde::{Deserialize, Serialize};

use crate::models::OpenAiTokenUsage;

/// OpenAI-compatible thread run object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRun {
    /// Assistant identifier used by the run.
    pub assistant_id: String,

    /// Unix timestamp in seconds when the run was cancelled.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cancelled_at: Option<i64>,

    /// Unix timestamp in seconds when the run completed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,

    /// Unix timestamp in seconds when the run was created.
    pub created_at: i64,

    /// Unix timestamp in seconds when the run expires.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,

    /// Unix timestamp in seconds when the run failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failed_at: Option<i64>,

    /// Run identifier.
    pub id: String,

    /// Instructions applied to the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,

    /// Last run error returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,

    /// Developer-defined run metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model id used by the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Object type, normally thread.run.
    pub object: String,

    /// Action required to continue the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub required_action: Option<String>,

    /// Unix timestamp in seconds when the run started.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub started_at: Option<i64>,

    /// Run status.
    pub status: String,

    /// Thread identifier used by the run.
    pub thread_id: String,

    /// Tool definitions available to the run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,

    /// Usage field on the open ai run, using the open ai token usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<OpenAiTokenUsage>,
}
