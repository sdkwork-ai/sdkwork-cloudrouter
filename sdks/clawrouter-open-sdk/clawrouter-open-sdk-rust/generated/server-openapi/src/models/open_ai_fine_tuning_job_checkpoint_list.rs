use serde::{Deserialize, Serialize};

use crate::models::OpenAiFineTuningJobCheckpoint;

/// OpenAI-compatible paginated list of fine-tuning job checkpoints.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningJobCheckpointList {
    /// Fine-tuning job checkpoints in the returned page.
    pub data: Vec<OpenAiFineTuningJobCheckpoint>,

    /// Identifier of the first object in this page when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub first_id: Option<String>,

    /// Whether additional pages are available.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,

    /// Identifier of the last object in this page when provided.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_id: Option<String>,

    /// Object type, normally list.
    pub object: String,
}
