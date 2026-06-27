use serde::{Deserialize, Serialize};

/// Create storage reconciliation run request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct CreateStorageReconciliationRunRequest {
    /// Bucket id field on create storage reconciliation run request.
    #[serde(rename = "bucketId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bucket_id: Option<String>,

    /// Check mode field on create storage reconciliation run request.
    #[serde(rename = "checkMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub check_mode: Option<String>,

    /// Dry run field on create storage reconciliation run request.
    #[serde(rename = "dryRun")]
    pub dry_run: bool,

    /// Provider id field on create storage reconciliation run request.
    #[serde(rename = "providerId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_id: Option<String>,

    /// Reason field on create storage reconciliation run request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,

    /// Run type field on create storage reconciliation run request.
    #[serde(rename = "runType")]
    pub run_type: String,
}
