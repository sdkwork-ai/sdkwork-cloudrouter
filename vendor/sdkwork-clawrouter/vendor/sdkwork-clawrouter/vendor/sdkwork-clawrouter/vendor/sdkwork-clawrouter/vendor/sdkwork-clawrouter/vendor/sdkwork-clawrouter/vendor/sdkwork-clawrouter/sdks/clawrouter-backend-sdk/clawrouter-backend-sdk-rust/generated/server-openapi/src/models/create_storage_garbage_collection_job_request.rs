use serde::{Deserialize, Serialize};

/// Create storage garbage collection job request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateStorageGarbageCollectionJobRequest {
    /// Criteria field on create storage garbage collection job request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub criteria: Option<std::collections::HashMap<String, String>>,

    /// Dry run field on create storage garbage collection job request.
    #[serde(rename = "dryRun")]
    pub dry_run: bool,

    /// Dry run sample field on create storage garbage collection job request.
    #[serde(rename = "dryRunSample")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dry_run_sample: Option<String>,

    /// Job type field on create storage garbage collection job request.
    #[serde(rename = "jobType")]
    pub job_type: String,

    /// Retention window field on create storage garbage collection job request.
    #[serde(rename = "retentionWindow")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retention_window: Option<String>,

    /// Target field on create storage garbage collection job request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
}
