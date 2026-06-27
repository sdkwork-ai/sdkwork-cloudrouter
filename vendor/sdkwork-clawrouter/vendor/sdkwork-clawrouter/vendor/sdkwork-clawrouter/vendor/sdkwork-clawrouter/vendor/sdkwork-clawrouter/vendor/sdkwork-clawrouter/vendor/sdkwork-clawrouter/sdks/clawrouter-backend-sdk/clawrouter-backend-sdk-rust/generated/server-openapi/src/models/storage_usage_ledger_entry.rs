use serde::{Deserialize, Serialize};

/// Storage usage ledger entry schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageUsageLedgerEntry {
    /// Delta bytes field on storage usage ledger entry.
    #[serde(rename = "deltaBytes")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub delta_bytes: Option<String>,

    /// Id field on storage usage ledger entry.
    pub id: String,

    /// Occurred at field on storage usage ledger entry.
    #[serde(rename = "occurredAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub occurred_at: Option<String>,

    /// Scope id field on storage usage ledger entry.
    #[serde(rename = "scopeId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,

    /// Scope type field on storage usage ledger entry.
    #[serde(rename = "scopeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope_type: Option<String>,
}
