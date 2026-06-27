use serde::{Deserialize, Serialize};

/// Model ranking refresh latest job schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ModelRankingRefreshLatestJob {
    /// Duration ms field on model ranking refresh latest job.
    #[serde(rename = "durationMs")]
    pub duration_ms: String,

    /// Ended at field on model ranking refresh latest job.
    #[serde(rename = "endedAt")]
    pub ended_at: String,

    /// Failure count field on model ranking refresh latest job.
    #[serde(rename = "failureCount")]
    pub failure_count: String,

    /// Failure reason field on model ranking refresh latest job.
    #[serde(rename = "failureReason")]
    pub failure_reason: String,

    /// Generated count field on model ranking refresh latest job.
    #[serde(rename = "generatedCount")]
    pub generated_count: String,

    /// Stable job execution identifier from ops_job_execution.
    pub id: String,

    /// Job name, expected to be model_ranking_refresh.
    #[serde(rename = "jobName")]
    pub job_name: String,

    /// Next refresh at field on model ranking refresh latest job.
    #[serde(rename = "nextRefreshAt")]
    pub next_refresh_at: String,

    /// Organization id field on model ranking refresh latest job.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Rank scope field on model ranking refresh latest job.
    #[serde(rename = "rankScope")]
    pub rank_scope: String,

    /// Snapshot date field on model ranking refresh latest job.
    #[serde(rename = "snapshotDate")]
    pub snapshot_date: String,

    /// Snapshot period field on model ranking refresh latest job.
    #[serde(rename = "snapshotPeriod")]
    pub snapshot_period: String,

    /// Source count field on model ranking refresh latest job.
    #[serde(rename = "sourceCount")]
    pub source_count: String,

    /// Started at field on model ranking refresh latest job.
    #[serde(rename = "startedAt")]
    pub started_at: String,

    /// Latest matching ranking refresh job status.
    pub status: String,

    /// Success count field on model ranking refresh latest job.
    #[serde(rename = "successCount")]
    pub success_count: String,

    /// Tenant id field on model ranking refresh latest job.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Window end field on model ranking refresh latest job.
    #[serde(rename = "windowEnd")]
    pub window_end: String,

    /// Window start field on model ranking refresh latest job.
    #[serde(rename = "windowStart")]
    pub window_start: String,
}
