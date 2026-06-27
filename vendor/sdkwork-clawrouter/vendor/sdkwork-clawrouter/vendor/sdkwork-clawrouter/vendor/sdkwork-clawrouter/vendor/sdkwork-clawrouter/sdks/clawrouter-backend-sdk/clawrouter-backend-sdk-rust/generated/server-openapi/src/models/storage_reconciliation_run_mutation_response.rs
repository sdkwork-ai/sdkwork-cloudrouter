use serde::{Deserialize, Serialize};

use crate::models::{StorageReconciliationRun};

/// Storage reconciliation run mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct StorageReconciliationRunMutationResponse {
    /// Reconciliation run field on storage reconciliation run mutation response.
    #[serde(rename = "reconciliationRun")]
    pub reconciliation_run: StorageReconciliationRun,

    /// Request id field on storage reconciliation run mutation response.
    #[serde(rename = "requestId")]
    pub request_id: String,
}
