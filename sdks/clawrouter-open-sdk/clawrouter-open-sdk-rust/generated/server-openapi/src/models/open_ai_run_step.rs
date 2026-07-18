use serde::{Deserialize, Serialize};

use crate::models::{OpenAiTokenUsage};

/// OpenAI-compatible run step object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiRunStep {
    /// Assistant identifier associated with the run step.
    pub assistant_id: String,

    /// Unix timestamp in seconds when the run step was cancelled.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cancelled_at: Option<i64>,

    /// Unix timestamp in seconds when the run step completed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<i64>,

    /// Unix timestamp in seconds when the run step was created.
    pub created_at: i64,

    /// Unix timestamp in seconds when the run step expired.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expired_at: Option<i64>,

    /// Unix timestamp in seconds when the run step failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failed_at: Option<i64>,

    /// Run step identifier.
    pub id: String,

    /// Last run step error returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,

    /// Developer-defined run step metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally thread.run.step.
    pub object: String,

    /// Run identifier associated with the run step.
    pub run_id: String,

    /// Run step status.
    pub status: String,

    /// Run step detail payload.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub step_details: Option<String>,

    /// Thread identifier associated with the run step.
    pub thread_id: String,

    /// Run step type.
    pub r#type: String,

    /// Usage field on the open ai run step, using the open ai token usage module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage: Option<OpenAiTokenUsage>,
}
