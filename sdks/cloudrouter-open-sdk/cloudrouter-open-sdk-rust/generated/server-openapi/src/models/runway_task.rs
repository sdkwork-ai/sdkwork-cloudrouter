use serde::{Deserialize, Serialize};

/// Runway generation task and its outputs.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RunwayTask {
    /// Task creation timestamp.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Failure reason when the task did not succeed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failure: Option<String>,

    /// Provider failure code when the task did not succeed.
    #[serde(rename = "failureCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub failure_code: Option<String>,

    /// Runway task identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Generated asset URLs.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output: Option<Vec<String>>,

    /// Completion ratio between 0 and 1.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub progress: Option<f64>,

    /// Task status: PENDING, RUNNING, SUCCEEDED, FAILED, or CANCELLED.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
