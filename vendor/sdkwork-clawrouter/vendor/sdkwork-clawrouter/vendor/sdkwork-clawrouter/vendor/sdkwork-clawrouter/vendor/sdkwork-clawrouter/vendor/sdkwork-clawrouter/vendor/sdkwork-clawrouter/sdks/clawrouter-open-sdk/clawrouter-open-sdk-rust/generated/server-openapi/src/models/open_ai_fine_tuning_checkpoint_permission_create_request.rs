use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to create a fine-tuning checkpoint permission.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiFineTuningCheckpointPermissionCreateRequest {
    /// Project identifier to grant access to the checkpoint.
    pub project_id: String,
}
