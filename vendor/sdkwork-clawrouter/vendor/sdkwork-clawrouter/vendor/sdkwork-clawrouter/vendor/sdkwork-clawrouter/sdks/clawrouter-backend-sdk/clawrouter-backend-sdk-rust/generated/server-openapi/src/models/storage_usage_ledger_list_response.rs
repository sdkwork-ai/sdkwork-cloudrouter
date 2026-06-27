use serde::{Deserialize, Serialize};

use crate::models::{StorageUsageLedgerEntry};

/// Storage usage ledger list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageUsageLedgerListResponse {
    /// Items field on storage usage ledger list response.
    pub items: Vec<StorageUsageLedgerEntry>,

    /// Next cursor field on storage usage ledger list response.
    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,

    /// Request id field on storage usage ledger list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
