use serde::{Deserialize, Serialize};

/// OpenAI-compatible request to add a group to a project.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectGroupCreateRequest {
    /// Organization group identifier.
    pub group_id: String,
}
