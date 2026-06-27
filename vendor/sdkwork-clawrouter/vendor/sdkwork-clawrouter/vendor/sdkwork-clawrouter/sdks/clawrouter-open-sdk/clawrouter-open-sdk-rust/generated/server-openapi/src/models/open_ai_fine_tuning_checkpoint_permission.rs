use serde::{Deserialize, Serialize};

/// OpenAI-compatible fine-tuning checkpoint permission object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningCheckpointPermission {
    /// Unix timestamp in seconds when the permission was created.
    pub created_at: i64,

    /// Fine-tuning checkpoint permission identifier.
    pub id: String,

    /// Object type, normally fine_tuning.checkpoint.permission.
    pub object: String,

    /// Project identifier granted access to the checkpoint.
    pub project_id: String,
}
