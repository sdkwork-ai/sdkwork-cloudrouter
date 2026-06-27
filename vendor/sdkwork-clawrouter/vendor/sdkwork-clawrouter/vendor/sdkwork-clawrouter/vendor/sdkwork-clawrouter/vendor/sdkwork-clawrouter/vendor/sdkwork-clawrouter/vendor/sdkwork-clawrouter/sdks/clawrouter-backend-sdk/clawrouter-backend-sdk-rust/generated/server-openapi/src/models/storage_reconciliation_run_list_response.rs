use serde::{Deserialize, Serialize};

use crate::models::{StorageReconciliationRun};

/// Storage reconciliation run list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageReconciliationRunListResponse {
    /// Items field on storage reconciliation run list response.
    pub items: Vec<StorageReconciliationRun>,

    /// Next cursor field on storage reconciliation run list response.
    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,

    /// Request id field on storage reconciliation run list response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
