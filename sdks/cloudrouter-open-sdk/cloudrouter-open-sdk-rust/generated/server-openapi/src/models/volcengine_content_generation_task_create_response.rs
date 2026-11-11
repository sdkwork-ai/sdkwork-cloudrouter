use serde::{Deserialize, Serialize};

/// Volcengine Ark video generation task creation response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct VolcengineContentGenerationTaskCreateResponse {
    /// Created task id; poll `GET /api/v3/contents/generations/tasks/{task_id}` for its result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
}
