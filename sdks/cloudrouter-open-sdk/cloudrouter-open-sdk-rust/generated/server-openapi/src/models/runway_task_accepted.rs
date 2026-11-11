use serde::{Deserialize, Serialize};

/// Runway task submission acknowledgement; poll the task through GET /runway/v1/tasks/{task_id}.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RunwayTaskAccepted {
    /// Provider cost estimate for the submitted task, in credits.
    #[serde(rename = "estimatedCost")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub estimated_cost: Option<std::collections::HashMap<String, String>>,

    /// Runway task identifier used for polling.
    pub id: String,
}
