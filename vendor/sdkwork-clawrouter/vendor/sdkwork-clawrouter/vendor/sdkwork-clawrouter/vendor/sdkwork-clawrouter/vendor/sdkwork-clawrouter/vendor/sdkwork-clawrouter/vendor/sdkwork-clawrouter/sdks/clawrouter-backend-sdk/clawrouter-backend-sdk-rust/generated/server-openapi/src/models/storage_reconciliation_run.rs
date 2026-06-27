use serde::{Deserialize, Serialize};

/// Storage reconciliation run schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageReconciliationRun {
    /// Bucket id field on storage reconciliation run.
    #[serde(rename = "bucketId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bucket_id: Option<String>,

    /// Bucket name field on storage reconciliation run.
    #[serde(rename = "bucketName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bucket_name: Option<String>,

    /// Dry run field on storage reconciliation run.
    #[serde(rename = "dryRun")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dry_run: Option<bool>,

    /// Finished at field on storage reconciliation run.
    #[serde(rename = "finishedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<String>,

    /// Id field on storage reconciliation run.
    pub id: String,

    /// Issue count field on storage reconciliation run.
    #[serde(rename = "issueCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub issue_count: Option<String>,

    /// Issues field on storage reconciliation run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub issues: Option<String>,

    /// Provider code field on storage reconciliation run.
    #[serde(rename = "providerCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_code: Option<String>,

    /// Provider id field on storage reconciliation run.
    #[serde(rename = "providerId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_id: Option<String>,

    /// Run id field on storage reconciliation run.
    #[serde(rename = "runId")]
    pub run_id: String,

    /// Run type field on storage reconciliation run.
    #[serde(rename = "runType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run_type: Option<String>,

    /// Scope field on storage reconciliation run.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,

    /// Started at field on storage reconciliation run.
    #[serde(rename = "startedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,

    /// Status field on storage reconciliation run.
    pub status: String,
}
