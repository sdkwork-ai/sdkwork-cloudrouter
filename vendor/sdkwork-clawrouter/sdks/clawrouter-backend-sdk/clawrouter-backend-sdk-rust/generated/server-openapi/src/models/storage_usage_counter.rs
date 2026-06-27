use serde::{Deserialize, Serialize};

/// Storage usage counter schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageUsageCounter {
    /// File count field on storage usage counter.
    #[serde(rename = "fileCount")]
    pub file_count: String,

    /// Files field on storage usage counter.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub files: Option<String>,

    /// Id field on storage usage counter.
    pub id: String,

    /// Reserved field on storage usage counter.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reserved: Option<String>,

    /// Reserved bytes field on storage usage counter.
    #[serde(rename = "reservedBytes")]
    pub reserved_bytes: String,

    /// Scope field on storage usage counter.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,

    /// Scope id field on storage usage counter.
    #[serde(rename = "scopeId")]
    pub scope_id: String,

    /// Scope type field on storage usage counter.
    #[serde(rename = "scopeType")]
    pub scope_type: String,

    /// Snapshot at field on storage usage counter.
    #[serde(rename = "snapshotAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub snapshot_at: Option<String>,

    /// Updated at field on storage usage counter.
    #[serde(rename = "updatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,

    /// Used field on storage usage counter.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub used: Option<String>,

    /// Used bytes field on storage usage counter.
    #[serde(rename = "usedBytes")]
    pub used_bytes: String,
}
