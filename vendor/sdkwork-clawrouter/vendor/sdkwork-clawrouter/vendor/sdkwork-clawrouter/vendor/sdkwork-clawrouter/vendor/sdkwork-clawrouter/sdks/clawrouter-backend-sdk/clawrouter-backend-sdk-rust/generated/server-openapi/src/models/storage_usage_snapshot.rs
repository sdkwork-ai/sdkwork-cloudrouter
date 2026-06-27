use serde::{Deserialize, Serialize};

/// Storage usage snapshot schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageUsageSnapshot {
    /// File count field on storage usage snapshot.
    #[serde(rename = "fileCount")]
    pub file_count: String,

    /// Id field on storage usage snapshot.
    pub id: String,

    /// Reserved bytes field on storage usage snapshot.
    #[serde(rename = "reservedBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reserved_bytes: Option<String>,

    /// Scope field on storage usage snapshot.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,

    /// Scope id field on storage usage snapshot.
    #[serde(rename = "scopeId")]
    pub scope_id: String,

    /// Scope type field on storage usage snapshot.
    #[serde(rename = "scopeType")]
    pub scope_type: String,

    /// Snapshot at field on storage usage snapshot.
    #[serde(rename = "snapshotAt")]
    pub snapshot_at: String,

    /// Snapshot type field on storage usage snapshot.
    #[serde(rename = "snapshotType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub snapshot_type: Option<String>,

    /// Used bytes field on storage usage snapshot.
    #[serde(rename = "usedBytes")]
    pub used_bytes: String,
}
