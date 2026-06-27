use serde::{Deserialize, Serialize};

/// Storage garbage collection job schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageGarbageCollectionJob {
    /// Candidate count field on storage garbage collection job.
    #[serde(rename = "candidateCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub candidate_count: Option<String>,

    /// Created at field on storage garbage collection job.
    #[serde(rename = "createdAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,

    /// Dry run field on storage garbage collection job.
    #[serde(rename = "dryRun")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dry_run: Option<bool>,

    /// Id field on storage garbage collection job.
    pub id: String,

    /// Job id field on storage garbage collection job.
    #[serde(rename = "jobId")]
    pub job_id: String,

    /// Job type field on storage garbage collection job.
    #[serde(rename = "jobType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub job_type: Option<String>,

    /// Retention field on storage garbage collection job.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retention: Option<String>,

    /// Status field on storage garbage collection job.
    pub status: String,

    /// Target field on storage garbage collection job.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
}
